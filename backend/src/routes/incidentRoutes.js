const express = require('express');
const router = express.Router();
const incidentService = require('../services/incidentService');
const { requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/constants');

// Create labeled incident (e.g., "Factory Fire - Savar")
router.post(
  '/',
  requirePermission(PERMISSIONS.INCIDENT_LINK),
  (req, res, next) => {
    try {
      const actor = req.user;
      const incident = incidentService.createLabeledIncident(req.body, actor);
      res.status(201).json({ success: true, data: incident });
    } catch (err) {
      next(err);
    }
  }
);

// Get all cases linked to an incident by label with shared evidence reference
router.get(
  '/:label/cases',
  requirePermission(PERMISSIONS.INCIDENT_READ),
  (req, res, next) => {
    try {
      const { label } = req.params;
      const result = incidentService.getIncidentCases(decodeURIComponent(label));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
