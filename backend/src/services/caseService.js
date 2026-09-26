const caseRepository = require('../repositories/caseRepository');
const applicationRepository = require('../repositories/applicationRepository');
const personRepository = require('../repositories/personRepository');
const auditService = require('./auditService');
const provenanceService = require('./provenanceService');
const taskService = require('./taskService');
const referralService = require('./referralService');
const incidentService = require('./incidentService');
const safeContactService = require('./safeContactService');
const evidenceService = require('./evidenceService');
const idGenerator = require('../utils/idGenerator');
const { CASE_STATES, AUDIT_ACTIONS, ROLES } = require('../utils/constants');
const lawyerAccountabilityService = require('./lawyerAccountabilityService');

class CaseService {
  createCase(payload, actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }) {
    if (!payload.application_id) {
      throw new Error('application_id is required to create a case');
    }

    const application = applicationRepository.findById(payload.application_id);
    if (!application) {
      throw new Error(`Application ${payload.application_id} not found`);
    }

    const caseId = payload.id || idGenerator.caseId();
    const caseNumber = payload.case_number || `DLAO-${(application.intake_office || 'GEN').replace(/\s+/g, '-').toUpperCase().slice(0, 8)}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialStatus = payload.status || CASE_STATES.NEW;
    if (!Object.values(CASE_STATES).includes(initialStatus)) {
      throw new Error(`Invalid initial case status: ${initialStatus}`);
    }

    // 1. Create case in database
    const caseData = caseRepository.create({
      id: caseId,
      application_id: application.id,
      case_number: caseNumber,
      title: payload.title || application.summary,
      title_bn: payload.title_bn || application.summary_bn,
      category: payload.category || application.category,
      status: initialStatus,
      priority: payload.priority || 'MEDIUM',
      intake_office: payload.intake_office || application.intake_office,
      court_name: payload.court_name || null,
      assigned_officer_id: payload.assigned_officer_id || null,
      assigned_lawyer_id: payload.assigned_lawyer_id || null,
      filing_date: payload.filing_date || new Date().toISOString(),
      lawyer_last_active_at: payload.lawyer_last_active_at || null,
      lawyer_status: payload.lawyer_status || 'ACTIVE',
      deadline_alert_level: payload.deadline_alert_level || 'NORMAL',
      citizen_inquiry_code: payload.citizen_inquiry_code || null,
      details_json: payload.details || payload.details_json || {}
    });

    // 2. Automatically link applicant to case
    caseRepository.addPersonToCase({
      id: idGenerator.personId(),
      case_id: caseId,
      person_id: application.applicant_id,
      role_in_case: 'APPLICANT',
      relationship_to_applicant: 'SELF',
      is_primary_contact: application.representative_id ? 0 : 1,
      notes: 'Primary applicant transferred from intake application'
    });

    // 3. If an authorized representative exists, link explicitly with clear relationship
    if (application.representative_id) {
      caseRepository.addPersonToCase({
        id: idGenerator.personId(),
        case_id: caseId,
        person_id: application.representative_id,
        role_in_case: 'AUTHORIZED_REPRESENTATIVE',
        relationship_to_applicant: payload.representative_relationship || 'AUTHORIZED_REPRESENTATIVE',
        authorization_doc_ref: payload.authorization_doc_ref || 'DLAO-REP-AUTH-FORM',
        is_primary_contact: 1,
        notes: 'Authorized representative acting on behalf of applicant'
      });
    }

    // 4. If safe contact configuration is provided (Flow 1: Moyuri safe contact mode)
    if (payload.safe_contact) {
      safeContactService.configureSafeContact({
        case_id: caseId,
        person_id: application.applicant_id,
        preferred_contact_method: payload.safe_contact.preferred_contact_method || 'IN_PERSON_REPRESENTATIVE',
        unsafe_channels: payload.safe_contact.unsafe_channels || ['PRIMARY_PHONE', 'DIRECT_SMS'],
        safe_channel_details: payload.safe_contact.safe_channel_details || null,
        restriction_reason: payload.safe_contact.restriction_reason || 'Unsafe perpetrator contact situation',
        danger_level: payload.safe_contact.danger_level || 'HIGH',
        actor
      });
    }

    // 5. Update application status
    applicationRepository.updateStatus(application.id, 'CONVERTED_TO_CASE');

    // 6. Record audit event
    auditService.recordAuditEvent({
      case_id: caseId,
      application_id: application.id,
      action: AUDIT_ACTIONS.CASE_CREATED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_after: caseData,
      notes: `Case ${caseNumber} created from Application ${application.id}`
    });

    return caseData;
  }

  getCase(id, options = { includeAll: true }, actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }) {
    const caseData = caseRepository.findById(id);
    if (!caseData) return null;

    // RBAC check: B5 Panel Lawyer can only access assigned cases
    if (actor.role === ROLES.B5_PANEL_LAWYER) {
      const people = caseRepository.listPeopleForCase(id);
      const isAssigned = (caseData.assigned_lawyer_id === actor.id) ||
        people.some(p => p.person_id === actor.id && p.role_in_case === 'PANEL_LAWYER');

      if (!isAssigned) {
        try {
          auditService.recordAuditEvent({
            case_id: id,
            application_id: caseData.application_id,
            action: AUDIT_ACTIONS.ACCESS_DENIED,
            actor_id: actor.id,
            actor_role: actor.role,
            notes: `Panel Lawyer '${actor.id}' attempted unauthorized access to unassigned case '${id}'`
          });
        } catch (e) {}

        const err = new Error(`Access denied: Panel Lawyer is only authorized to access assigned cases`);
        err.status = 403;
        throw err;
      }
    }

    if (options.includeAll) {
      caseData.people = caseRepository.listPeopleForCase(id);
      caseData.tasks = taskService.getTasksForCase(id);
      caseData.referrals = referralService.getReferralsForCase(id);
      caseData.incidents = incidentService.getIncidentsForCase(id);
      caseData.evidence = evidenceService.getEvidenceForCase(id, actor);
      caseData.provenance = provenanceService.getProvenanceForCase(id);
      caseData.audit_trail = auditService.getAuditTrailForCase(id);
      caseData.safe_contacts = safeContactService.getSafeContactsForCase(id, actor);
      caseData.lawyer_accountability = lawyerAccountabilityService.calculateAccountability(caseData, caseData.tasks);
    }

    return caseData;
  }

  listCases(filters = {}) {
    return caseRepository.list(filters);
  }

  updateStatus(id, newStatus, actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }, notes = null) {
    if (!Object.values(CASE_STATES).includes(newStatus)) {
      throw new Error(`Invalid case status: '${newStatus}'. Must be one of: ${Object.values(CASE_STATES).join(', ')}`);
    }

    const current = caseRepository.findById(id);
    if (!current) throw new Error(`Case ${id} not found`);

    const updated = caseRepository.updateStatus(id, newStatus);

    auditService.recordAuditEvent({
      case_id: id,
      action: AUDIT_ACTIONS.STATUS_CHANGED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_before: { status: current.status },
      payload_after: { status: newStatus },
      notes: notes || `Case status updated from ${current.status} to ${newStatus}`
    });

    return updated;
  }

  addPersonToCase(caseId, payload, actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }) {
    let personId = payload.person_id;

    if (!personId && payload.person) {
      const pData = payload.person;
      let existing = pData.national_id ? personRepository.findByNid(pData.national_id) : null;
      if (!existing) {
        existing = personRepository.create({
          id: idGenerator.personId(),
          ...pData
        });
      }
      personId = existing.id;
    }

    if (!personId) {
      throw new Error('person_id or person object is required');
    }

    const link = caseRepository.addPersonToCase({
      id: idGenerator.personId(),
      case_id: caseId,
      person_id: personId,
      role_in_case: payload.role_in_case,
      relationship_to_applicant: payload.relationship_to_applicant || 'SELF',
      authorization_doc_ref: payload.authorization_doc_ref || null,
      is_primary_contact: payload.is_primary_contact ? 1 : 0,
      notes: payload.notes || null
    });

    auditService.recordAuditEvent({
      case_id: caseId,
      action: payload.role_in_case === 'AUTHORIZED_REPRESENTATIVE' 
        ? AUDIT_ACTIONS.REPRESENTATIVE_LINKED 
        : AUDIT_ACTIONS.PERSON_LINKED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_after: link,
      notes: `Linked person ${link.full_name} to case as ${payload.role_in_case}`
    });

    return link;
  }

  assignLawyer(caseId, lawyerId, actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }) {
    const caseData = caseRepository.findById(caseId);
    if (!caseData) throw new Error(`Case ${caseId} not found`);

    const lawyer = personRepository.findById(lawyerId);
    if (!lawyer) throw new Error(`Lawyer with person ID ${lawyerId} not found`);

    caseRepository.assignLawyer(caseId, lawyerId);

    // Link in case_people as PANEL_LAWYER
    caseRepository.addPersonToCase({
      id: idGenerator.personId(),
      case_id: caseId,
      person_id: lawyerId,
      role_in_case: 'PANEL_LAWYER',
      relationship_to_applicant: 'LEGAL_COUNSEL',
      is_primary_contact: 0,
      notes: 'Assigned Panel Lawyer for legal representation'
    });

    if (caseData.status === CASE_STATES.NEW || caseData.status === CASE_STATES.UNDER_REVIEW) {
      caseRepository.updateStatus(caseId, CASE_STATES.ASSIGNED);
    }

    auditService.recordAuditEvent({
      case_id: caseId,
      action: AUDIT_ACTIONS.LAWYER_ASSIGNED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_after: { assigned_lawyer_id: lawyerId, lawyer_name: lawyer.full_name },
      notes: `Assigned Panel Lawyer ${lawyer.full_name} (${lawyerId}) to case`
    });

    return this.getCase(caseId, { includeAll: true }, actor);
  }
}

module.exports = new CaseService();
