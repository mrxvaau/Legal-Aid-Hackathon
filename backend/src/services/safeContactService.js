const safeContactRepository = require('../repositories/safeContactRepository');
const auditService = require('./auditService');
const permissionService = require('./permissionService');
const idGenerator = require('../utils/idGenerator');
const { AUDIT_ACTIONS, PERMISSIONS } = require('../utils/constants');

class SafeContactService {
  configureSafeContact({
    case_id,
    person_id,
    preferred_contact_method,
    unsafe_channels = [],
    safe_channel_details,
    restriction_reason,
    danger_level = 'HIGH',
    actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }
  }) {
    if (!case_id) throw new Error('case_id is required');
    if (!person_id) throw new Error('person_id is required');
    if (!preferred_contact_method) throw new Error('preferred_contact_method is required');
    if (!restriction_reason) throw new Error('restriction_reason is required');

    const id = `SC-${case_id.replace(/^CASE-/, '')}-${person_id.replace(/^PER-/, '')}`;
    const safeContact = safeContactRepository.create({
      id,
      case_id,
      person_id,
      is_safe_contact_active: 1,
      preferred_contact_method,
      unsafe_channels,
      safe_channel_details,
      restriction_reason,
      danger_level,
      configured_by_id: actor.id,
      configured_by_role: actor.role
    });

    auditService.recordAuditEvent({
      case_id,
      action: AUDIT_ACTIONS.SAFE_CONTACT_CONFIGURED,
      actor_id: actor.id,
      actor_role: actor.role,
      payload_after: {
        id,
        preferred_contact_method,
        danger_level,
        unsafe_channels,
        restriction_reason
      },
      notes: `Safe contact protection mode active for person ${person_id}. Unsafe channels restricted.`
    });

    return safeContact;
  }

  getSafeContactsForCase(caseId, actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }) {
    const list = safeContactRepository.findByCaseId(caseId);
    if (!list || list.length === 0) return [];

    const permCheck = permissionService.checkPermission(actor.role, PERMISSIONS.SAFE_CONTACT_READ, {
      actor_id: actor.id,
      case_id: caseId
    });

    return list.map(item => {
      if (permCheck.allowed) {
        // Authorized role: return complete safe contact details
        return {
          ...item,
          is_masked: false
        };
      } else {
        // Unauthorized/restricted role: MASK sensitive contact channel details
        return {
          id: item.id,
          case_id: item.case_id,
          person_id: item.person_id,
          is_safe_contact_active: item.is_safe_contact_active,
          preferred_contact_method: item.preferred_contact_method,
          unsafe_channels: item.unsafe_channels,
          safe_channel_details: '[REDACTED: RESTRICTED CONTACT PROTOCOL ACTIVE]',
          restriction_reason: item.restriction_reason,
          danger_level: item.danger_level,
          confidentiality_notice: 'ACCESS RESTRICTED: Contact details hidden to protect survivor safety.',
          is_masked: true
        };
      }
    });
  }
}

module.exports = new SafeContactService();
