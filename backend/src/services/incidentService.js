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

  getIncidentsForCase(caseId) {
    return incidentRepository.listByCaseId(caseId);
  }
}

module.exports = new IncidentService();
