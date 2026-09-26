const referralRepository = require('../repositories/referralRepository');
const caseRepository = require('../repositories/caseRepository');
const auditService = require('./auditService');
const idGenerator = require('../utils/idGenerator');
const { AUDIT_ACTIONS, CASE_STATES } = require('../utils/constants');

class ReferralService {
  createReferral({
    case_id,
    referral_type,
    target_authority_type = 'DLAO',
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
      target_authority_type,
      referring_office,
      receiving_office,
      referring_role: referring_role || actor.role,
      receiving_role,
      status: 'PENDING',
      acknowledgement_status: 'UNACKNOWLEDGED',
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

  acknowledgeReferral(id, assignedOfficerId = null, notes = null, actor = { id: 'SYSTEM', role: 'B6_RECEIVING_DLAO' }) {
    const previous = referralRepository.findById(id);
    if (!previous) throw new Error(`Referral ${id} not found`);

    const finalOfficerId = assignedOfficerId || actor.id;
    const updated = referralRepository.acknowledge(id, finalOfficerId, notes);

    auditService.recordAuditEvent({
      case_id: previous.case_id,
      action: AUDIT_ACTIONS.REFERRAL_ACKNOWLEDGED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B6_RECEIVING_DLAO',
      payload_before: {
        acknowledgement_status: previous.acknowledgement_status,
        status: previous.status,
        assigned_officer_id: previous.assigned_officer_id
      },
      payload_after: {
        acknowledgement_status: 'ACKNOWLEDGED',
        status: updated.status,
        assigned_officer_id: updated.assigned_officer_id,
        notes: updated.notes
      },
      notes: `Referral ${id} acknowledged by ${actor.role} (${actor.id}); receiving owner set to ${updated.assigned_officer_id}`
    });

    return this._formatReferral(updated);
  }

  assignOwnership(id, assignedOfficerId, notes = null, actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }) {
    const previous = referralRepository.findById(id);
    if (!previous) throw new Error(`Referral ${id} not found`);
    if (!assignedOfficerId) throw new Error('assigned_officer_id is required');

    const updated = referralRepository.assignOwnership(id, assignedOfficerId, notes);

    auditService.recordAuditEvent({
      case_id: previous.case_id,
      action: AUDIT_ACTIONS.REFERRAL_OWNERSHIP_ASSIGNED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_before: { assigned_officer_id: previous.assigned_officer_id },
      payload_after: { assigned_officer_id: updated.assigned_officer_id },
      notes: `Referral ${id} receiving ownership assigned to ${assignedOfficerId} by ${actor.role} (${actor.id})`
    });

    return this._formatReferral(updated);
  }

  updateReferralStatus(id, newStatus, receivingRole = null, notes = null, actor = { id: 'SYSTEM', role: 'B6_RECEIVING_DLAO' }) {
    const previous = referralRepository.findById(id);
    if (!previous) throw new Error(`Referral ${id} not found`);

    const updated = referralRepository.updateStatus(id, newStatus, receivingRole, notes);

    auditService.recordAuditEvent({
      case_id: previous.case_id,
      action: AUDIT_ACTIONS.REFERRAL_STATUS_CHANGED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B6_RECEIVING_DLAO',
      payload_before: { status: previous.status },
      payload_after: { status: updated.status },
      notes: `Referral ${id} status updated to ${newStatus} by ${actor.role} (${actor.id})`
    });

    return this._formatReferral(updated);
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

    return this._formatReferral(updated);
  }

  getReferralsForCase(caseId) {
    const list = referralRepository.listByCaseId(caseId);
    return list.map(r => this._formatReferral(r));
  }

  _formatReferral(ref) {
    if (!ref) return null;
    return {
      ...ref,
      simulation_notice: 'External agency integration simulated for prototype.',
      owner_display: ref.assigned_officer_id || 'UNASSIGNED',
      is_acknowledged: ref.acknowledgement_status === 'ACKNOWLEDGED'
    };
  }
}

module.exports = new ReferralService();

