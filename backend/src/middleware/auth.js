/**
 * ACTOR SIMULATION & AUTHORIZATION MIDDLEWARE
 * 
 * ARCHITECTURAL NOTICE:
 * This module implements a DEVELOPMENT / PROTOTYPE ACTOR SIMULATION ADAPTER.
 * It is NOT production authentication.
 * 
 * In this hackathon prototype, caller identity and role context are simulated via
 * incoming HTTP headers ('x-user-role', 'x-user-id', etc.) to allow evaluating multi-role
 * provider workflows (B1–B7) and citizen interactions seamlessly from API tests and UI.
 * 
 * In a future production deployment:
 * 1. This adapter will be replaced by a verified session/JWT/OAuth token validator.
 * 2. req.user will be populated from verified cryptographic claims.
 * 3. The authorization logic below (requirePermission) remains identical and UI-independent.
 */

const permissionService = require('../services/permissionService');
const { ROLES } = require('../utils/constants');

/**
 * Isolated Prototype Actor Simulation Extractor
 */
function extractActorSimulation(req) {
  const rawRole = req.headers['x-user-role'] || req.query.role;
  const role = (rawRole && Object.values(ROLES).includes(rawRole)) ? rawRole : ROLES.B1_DLAO_OFFICER;
  const userId = req.headers['x-user-id'] || req.query.userId || `USR-${role}`;
  const userName = req.headers['x-user-name'] || `${role} Operator`;
  const office = req.headers['x-user-office'] || 'DLAO Dhaka';

  return {
    id: userId,
    name: userName,
    role,
    office,
    isSimulatedActor: true
  };
}

function authMiddleware(req, res, next) {
  req.user = extractActorSimulation(req);
  next();
}

/**
 * Backend Authoritative Permission Guard
 * Authorization is enforced strictly by the backend regardless of UI state.
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
  requirePermission,
  extractActorSimulation
};
