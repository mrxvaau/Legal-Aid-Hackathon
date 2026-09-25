const auditRepository = require('../repositories/auditRepository');
const idGenerator = require('../utils/idGenerator');

class AuditService {
  /**
   * Record an immutable audit event for state reconstruction
   */
  recordAuditEvent({
    case_id = null,
    application_id = null,
    action,
    actor_id,
    actor_role,
    actor_ip = null,
    payload_before = null,
    payload_after = null,
    notes = null
  }) {
    if (!action) throw new Error('Audit action is required');
    if (!actor_id) throw new Error('Audit actor_id is required');
    if (!actor_role) throw new Error('Audit actor_role is required');

    const id = idGenerator.auditId();
    return auditRepository.create({
      id,
      case_id,
      application_id,
      action,
      actor_id,
      actor_role,
      actor_ip,
      payload_before,
      payload_after,
      notes
    });
  }

  getAuditTrailForCase(caseId) {
    return auditRepository.listByCaseId(caseId);
  }

  getAuditTrailForApplication(applicationId) {
    return auditRepository.listByApplicationId(applicationId);
  }
}

module.exports = new AuditService();
