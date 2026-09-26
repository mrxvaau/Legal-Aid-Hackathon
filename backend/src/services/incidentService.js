const incidentRepository = require('../repositories/incidentRepository');
const auditService = require('./auditService');
const idGenerator = require('../utils/idGenerator');
const { AUDIT_ACTIONS } = require('../utils/constants');

class IncidentService {
  linkIncident({
    case_id,
    incident_type,
    incident_date,
    location,
    description,
    description_bn = null,
    severity = 'MEDIUM',
    is_sensitive_evidence = false,
    evidence_privacy_level = 'STANDARD',
    redacted_summary = null,
    police_station_jurisdiction = null,
    gd_or_fir_number = null,
    actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }
  }) {
    if (!case_id) throw new Error('case_id is required');
    if (!incident_type) throw new Error('incident_type is required');
    if (!incident_date) throw new Error('incident_date is required');
    if (!location) throw new Error('location is required');
    if (!description) throw new Error('description is required');

    const id = idGenerator.incidentId();
    const incident = incidentRepository.create({
      id,
      case_id,
      incident_type,
      incident_date,
      location,
      description,
      description_bn,
      severity,
      is_sensitive_evidence,
      evidence_privacy_level,
      redacted_summary,
      police_station_jurisdiction,
      gd_or_fir_number,
      linked_by_user_id: actor.id || 'SYSTEM'
    });

    auditService.recordAuditEvent({
      case_id,
      action: AUDIT_ACTIONS.INCIDENT_LINKED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_after: {
        id,
        incident_type,
        severity,
        is_sensitive_evidence,
        evidence_privacy_level
      },
      notes: `Incident linked: ${incident_type} at ${location} (${severity})${is_sensitive_evidence ? ' [SENSITIVE EVIDENCE MARKED]' : ''}`
    });

    return incident;
  }

  getIncidentsByCaseId(caseId) {
    if (!caseId) throw new Error('case_id is required');
    return incidentRepository.listByCaseId(caseId);
  }

  getIncidentsForCase(caseId) {
    return this.getIncidentsByCaseId(caseId);
  }

  createLabeledIncident(data, actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }) {
    if (!data.incident_label) throw new Error('incident_label is required');
    const existing = incidentRepository.findIncidentByLabel(data.incident_label);
    if (existing) {
      return existing;
    }
    const incident = incidentRepository.createLabeledIncident(data);
    auditService.recordAuditEvent({
      action: 'INCIDENT_CREATED',
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_after: incident,
      notes: `Created labeled mass/group incident: "${data.incident_label}"`
    });
    return incident;
  }

  linkCaseToIncident(caseId, { incident_label, incident_type, incident_date, location, description }, actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }) {
    if (!caseId) throw new Error('case_id is required');
    if (!incident_label) throw new Error('incident_label is required');

    let incident = incidentRepository.findIncidentByLabel(incident_label);
    if (!incident) {
      incident = incidentRepository.createLabeledIncident({
        incident_label,
        location: location || 'Incident Location',
        incident_type: incident_type || 'MASS_INCIDENT',
        description: description || `Incident: ${incident_label}`
      });
    }

    const link = incidentRepository.linkCaseToIncident({
      case_id: caseId,
      incident_label,
      incident_type: incident_type || incident.incident_type,
      incident_date: incident_date || incident.incident_date,
      location: location || incident.location,
      description: description || incident.description,
      actor_id: actor.id
    });

    auditService.recordAuditEvent({
      case_id: caseId,
      action: AUDIT_ACTIONS.INCIDENT_LINKED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_after: { link, incident },
      notes: `Case ${caseId} linked to mass incident: "${incident_label}". Case maintains independent status, applicant, and legal remedy.`
    });

    return { link, incident };
  }

  getIncidentCases(label) {
    const incident = incidentRepository.findIncidentByLabel(label);
    const cases = incidentRepository.listCasesByIncidentLabel(label);
    return {
      incident: incident || { incident_label: label },
      linked_cases_count: cases.length,
      shared_evidence_reference: incident ? incident.shared_evidence_ref : null,
      cases,
      guardrail: 'Linked cases remain distinct case records with separate outcomes, instructions, and applicants, sharing only the common incident and evidence reference.'
    };
  }
}

module.exports = new IncidentService();
