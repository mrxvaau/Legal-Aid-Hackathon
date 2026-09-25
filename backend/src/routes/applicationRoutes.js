const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/constants');

router.post(
  '/',
  requirePermission(PERMISSIONS.APPLICATION_CREATE),
  applicationController.createApplication.bind(applicationController)
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.APPLICATION_READ),
  applicationController.getApplication.bind(applicationController)
);

router.get(
  '/',
  requirePermission(PERMISSIONS.APPLICATION_READ),
  applicationController.listApplications.bind(applicationController)
);

module.exports = router;
