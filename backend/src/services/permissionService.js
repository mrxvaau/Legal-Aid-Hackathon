const { ROLE_PERMISSIONS, ROLES, PERMISSIONS } = require('../utils/constants');
const auditService = require('./auditService');

class PermissionService {
  /**
   * Check if a role possesses the specified permission
   */
  checkPermission(role, permission, context = {}) {
    if (!role) {
      return { allowed: false, reason: 'No role specified' };
    }

    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(role)) {
      return { allowed: false, reason: `Unknown role: ${role}` };
    }

    const permissions = ROLE_PERMISSIONS[role] || [];
    const isAllowed = permissions.includes(permission);

    if (!isAllowed) {
      // Record audit event for permission rejection if context allows
      try {
        if (context.recordAudit !== false && context.actor_id) {
          auditService.recordAuditEvent({
            case_id: context.case_id || null,
            application_id: context.application_id || null,
            action: 'ACCESS_DENIED',
            actor_id: context.actor_id,
            actor_role: role,
            notes: `Permission denied: role '${role}' requested '${permission}'`
          });
        }
      } catch (e) {
        // Suppress secondary audit error in permission check
      }

      return {
        allowed: false,
        reason: `Role '${role}' lacks required permission '${permission}'`
      };
    }

    return { allowed: true };
  }

  getPermissionsForRole(role) {
    return ROLE_PERMISSIONS[role] || [];
  }
}

module.exports = new PermissionService();
