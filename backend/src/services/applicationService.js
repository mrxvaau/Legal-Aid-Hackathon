const applicationRepository = require('../repositories/applicationRepository');
const personRepository = require('../repositories/personRepository');
const auditService = require('./auditService');
const provenanceService = require('./provenanceService');
const idGenerator = require('../utils/idGenerator');
const { AUDIT_ACTIONS, PROVENANCE_SOURCES } = require('../utils/constants');

class ApplicationService {
  createApplication(payload, actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }) {
    let applicantId = payload.applicant_id;
    let representativeId = payload.representative_id;

    // 1. If applicant person details are passed inline, register or find in people table
    if (!applicantId && payload.applicant) {
      const applicantData = payload.applicant;
      let existingPerson = applicantData.national_id ? personRepository.findByNid(applicantData.national_id) : null;
      if (!existingPerson) {
        const newPersonId = idGenerator.personId();
        existingPerson = personRepository.create({
          id: newPersonId,
          ...applicantData
        });
      }
      applicantId = existingPerson.id;
    }

    if (!applicantId) {
      throw new Error('applicant_id or applicant object is required');
    }

    // 2. If representative person details are passed inline, register or find in people table
    if (!representativeId && payload.representative) {
      const repData = payload.representative;
      let existingRep = repData.national_id ? personRepository.findByNid(repData.national_id) : null;
      if (!existingRep) {
        const newRepId = idGenerator.personId();
        existingRep = personRepository.create({
          id: newRepId,
          ...repData
        });
      }
      representativeId = existingRep.id;
    }

    // 3. Create application
    const appId = payload.id || idGenerator.applicationId();
    const app = applicationRepository.create({
      id: appId,
      applicant_id: applicantId,
      representative_id: representativeId || null,
      category: payload.category || 'CIVIL_GENERAL',
      intake_channel: payload.intake_channel || 'DLAO_WALKIN',
      intake_office: payload.intake_office || 'DLAO Dhaka',
      status: payload.status || 'SUBMITTED',
      summary: payload.summary,
      summary_bn: payload.summary_bn || null,
      details_json: payload.details || payload.details_json || {},
      created_by_role: actor.role || payload.created_by_role || 'B1_DLAO_OFFICER',
      created_by_user_id: actor.id || payload.created_by_user_id || 'SYSTEM'
    });

    // 4. Record audit event
    auditService.recordAuditEvent({
      application_id: appId,
      action: AUDIT_ACTIONS.APPLICATION_CREATED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_after: app,
      notes: `New application ${appId} submitted via ${app.intake_channel}`
    });

    // 5. If provenance is supplied (e.g. intake oral statement or translation), record it
    if (payload.provenance) {
      const provList = Array.isArray(payload.provenance) ? payload.provenance : [payload.provenance];
      for (const prov of provList) {
        provenanceService.recordProvenance({
          application_id: appId,
          entity_type: 'application',
          entity_id: appId,
          field_name: prov.field_name || 'intake_statement',
          source_type: prov.source_type || PROVENANCE_SOURCES.TYPED_BY_STAFF,
          source_language: prov.source_language || 'bn',
          target_language: prov.target_language || 'bn',
          author_id: prov.author_id || actor.id,
          author_role: prov.author_role || actor.role,
          source_details: prov.source_details || null,
          raw_content: prov.raw_content || payload.summary,
          processed_content: prov.processed_content || payload.summary,
          confirmed_by: prov.confirmed_by || null
        });
      }
    }

    return app;
  }

  getApplication(id) {
    const app = applicationRepository.findById(id);
    if (!app) return null;
    return app;
  }

  listApplications(filters = {}) {
    return applicationRepository.list(filters);
  }
}

module.exports = new ApplicationService();
