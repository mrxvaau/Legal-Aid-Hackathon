const referralRepository = require('../repositories/referralRepository');
const caseRepository = require('../repositories/caseRepository');
const auditService = require('./auditService');
const idGenerator = require('../utils/idGenerator');
const { AUDIT_ACTIONS, CASE_STATES } = require('../utils/constants');

class ReferralService {
  createReferral({
    case_id,
    referral_type,
    referring_office,
    receiving_office,
    referring_role,
    receiving_role = null,
    reason,
    reason_bn = null,
    notes = null,
    actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }
  }) {
    if (!case_id) throw new Error('case_id is required');
    if (!referral_type) throw new Error('referral_type is required');
    if (!referring_office || !receiving_office) throw new Error('referring_office and receiving_office are required');
    if (!reason) throw new Error('reason is required');

    const id = idGenerator.referralId();
    const referral = referralRepository.create({
      id,
      case_id,
      referral_type,
      referring_office,
      receiving_office,
      referring_role: referring_role || actor.role,
      receiving_role,
      status: 'PENDING',
      reason,
      reason_bn,
      notes
    });

    // When an internal referral or DLAO referral happens, case state changes to REFERRED if not already
    const caseData = caseRepository.findById(case_id);
    if (caseData && caseData.status !== CASE_STATES.REFERRED) {
      caseRepository.updateStatus(case_id, CASE_STATES.REFERRED);
      auditService.recordAuditEvent({
        case_id,
        action: AUDIT_ACTIONS.STATUS_CHANGED,
        actor_id: actor.id || 'SYSTEM',
        actor_role: actor.role || 'B1_DLAO_OFFICER',
        payload_before: { status: caseData.status },
        payload_after: { status: CASE_STATES.REFERRED },
        notes: `Case status changed to REFERRED due to referral ${id}`
      });
    }

    auditService.recordAuditEvent({
      case_id,
      action: AUDIT_ACTIONS.REFERRAL_CREATED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_after: referral,
      notes: `Referral created from ${referring_office} to ${receiving_office} (${referral_type})`
    });

    return referral;
  }

  acceptReferral(id, receivingRole = 'B6_RECEIVING_DLAO', actor = { id: 'SYSTEM', role: 'B6_RECEIVING_DLAO' }) {
    const previous = referralRepository.findById(id);
    if (!previous) throw new Error(`Referral ${id} not found`);

    const updated = referralRepository.updateStatus(id, 'ACCEPTED', receivingRole);

    auditService.recordAuditEvent({
      case_id: previous.case_id,
      action: AUDIT_ACTIONS.REFERRAL_ACCEPTED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B6_RECEIVING_DLAO',
      payload_before: previous,
      payload_after: updated,
      notes: `Referral accepted by ${receivingRole}`
    });

    return updated;
  }

  getReferralsForCase(caseId) {
    return referralRepository.listByCaseId(caseId);
  }
}

module.exports = new ReferralService();
