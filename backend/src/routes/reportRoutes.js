const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const { requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/constants');

// GET /api/reports/case-summary — B7 DLAO Admin automated case portfolio summary
router.get(
  '/case-summary',
  requirePermission(PERMISSIONS.CASE_READ),
  (req, res, next) => {
    try {
      const report = reportService.getCaseSummaryReport(req.user);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
