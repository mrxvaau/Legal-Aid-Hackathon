const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/constants');

// Synchronize offline application (Idempotent & Conflict-aware)
router.post(
  '/applications',
  requirePermission(PERMISSIONS.APPLICATION_CREATE),
  syncController.syncApplication.bind(syncController)
);

// Resolve detected synchronization conflict
router.post(
  '/resolve-conflict',
  syncController.resolveConflict.bind(syncController)
);

// AI-assisted legal classification pre-assessment (Stage 4)
router.post(
  '/ai-pre-assess',
  syncController.aiPreAssess.bind(syncController)
);

module.exports = router;
