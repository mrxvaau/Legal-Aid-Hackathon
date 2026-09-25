const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const { requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/constants');

// Case CRUD & State
router.post(
  '/',
  requirePermission(PERMISSIONS.CASE_CREATE),
  caseController.createCase.bind(caseController)
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.CASE_READ),
  caseController.getCase.bind(caseController)
);

router.get(
  '/',
  requirePermission(PERMISSIONS.CASE_READ),
  caseController.listCases.bind(caseController)
);

router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.CASE_UPDATE_STATUS),
  caseController.updateStatus.bind(caseController)
);

// Case Events (Audit / State)
router.post(
  '/:id/events',
  requirePermission(PERMISSIONS.CASE_READ),
  caseController.createEvent.bind(caseController)
);

router.get(
  '/:id/events',
  requirePermission(PERMISSIONS.CASE_READ),
  caseController.getEvents.bind(caseController)
);

// Case People & Representatives
router.post(
  '/:id/people',
  requirePermission(PERMISSIONS.PEOPLE_LINK),
  caseController.addPerson.bind(caseController)
);

router.get(
  '/:id/people',
  requirePermission(PERMISSIONS.PEOPLE_READ),
  caseController.getPeople.bind(caseController)
);

// Case Tasks
router.post(
  '/:id/tasks',
  requirePermission(PERMISSIONS.TASK_CREATE),
  caseController.createTask.bind(caseController)
);

router.get(
  '/:id/tasks',
  requirePermission(PERMISSIONS.TASK_READ),
  caseController.getTasks.bind(caseController)
);

// Case Referrals
router.post(
  '/:id/referrals',
  requirePermission(PERMISSIONS.REFERRAL_CREATE),
  caseController.createReferral.bind(caseController)
);

router.get(
  '/:id/referrals',
  requirePermission(PERMISSIONS.REFERRAL_READ),
  caseController.getReferrals.bind(caseController)
);

router.post(
  '/:id/referrals/:referralId/accept',
  requirePermission(PERMISSIONS.REFERRAL_ACCEPT),
  caseController.acceptReferral.bind(caseController)
);

// Case Incidents
router.post(
  '/:id/incidents',
  requirePermission(PERMISSIONS.INCIDENT_LINK),
  caseController.createIncident.bind(caseController)
);

router.get(
  '/:id/incidents',
  requirePermission(PERMISSIONS.INCIDENT_READ),
  caseController.getIncidents.bind(caseController)
);

// Case Provenance
router.post(
  '/:id/provenance',
  requirePermission(PERMISSIONS.PROVENANCE_RECORD),
  caseController.createProvenance.bind(caseController)
);

router.get(
  '/:id/provenance',
  requirePermission(PERMISSIONS.PROVENANCE_READ),
  caseController.getProvenance.bind(caseController)
);

router.post(
  '/:id/provenance/:provId/confirm',
  requirePermission(PERMISSIONS.PROVENANCE_CONFIRM),
  caseController.confirmProvenance.bind(caseController)
);

// Lawyer Assignment
router.post(
  '/:id/lawyer',
  requirePermission(PERMISSIONS.CASE_ASSIGN_LAWYER),
  caseController.assignLawyer.bind(caseController)
);

module.exports = router;
