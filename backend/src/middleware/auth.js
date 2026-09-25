const permissionService = require('../services/permissionService');
const { ROLES } = require('../utils/constants');

/**
 * Authentication and Role Context Middleware
 * Extracts actor context from headers or query parameters (ideal for hackathon role-switching & API testing)
 */
function authMiddleware(req, res, next) {
  const role = req.headers['x-user-role'] || req.query.role || ROLES.B1_DLAO_OFFICER;
  const userId = req.headers['x-user-id'] || req.query.userId || 'USR-SYSTEM';
  const userName = req.headers['x-user-name'] || 'System Officer';
  const office = req.headers['x-user-office'] || 'DLAO Dhaka';

  req.user = {
    id: userId,
    name: userName,
    role,
    office
  };

  next();
}

/**
 * Permission Guard Middleware
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const actorRole = req.user?.role;
    const actorId = req.user?.id || 'ANONYMOUS';
    const caseId = req.params?.id || null;

    const check = permissionService.checkPermission(actorRole, permission, {
      actor_id: actorId,
      case_id: caseId
    });

    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: check.reason,
        requiredPermission: permission,
        currentRole: actorRole
      });
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  requirePermission
};
