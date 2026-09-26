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

// Non-Smartphone Citizen Status Query (Flow 4) - Public/Citizen Accessible
router.get(
  '/citizen-status',
  caseController.getCitizenStatus.bind(caseController)
);

router.post(
  '/citizen-status',
  caseController.getCitizenStatus.bind(caseController)
);

router.get(
  '/',
  requirePermission(PERMISSIONS.CASE_READ),
  caseController.listCases.bind(caseController)
);

// B7 Full-Text Case Search (Across Name, NID, Case Number, Token)
router.get(
  '/search',
  requirePermission(PERMISSIONS.CASE_READ),
  caseController.searchCases.bind(caseController)
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.CASE_READ),
  caseController.getCase.bind(caseController)
);

router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.CASE_UPDATE_STATUS),
  caseController.updateStatus.bind(caseController)
);

// Case Events (MUTATION: Guarded by CASE_CREATE_EVENT)
router.post(
  '/:id/events',
  requirePermission(PERMISSIONS.CASE_CREATE_EVENT),
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

// Safe Contacts (Flow 1)
router.post(
  '/:id/safe-contact',
  requirePermission(PERMISSIONS.SAFE_CONTACT_CONFIGURE),
  caseController.configureSafeContact.bind(caseController)
);

router.get(
  '/:id/safe-contact',
  requirePermission(PERMISSIONS.CASE_READ),
  caseController.getSafeContacts.bind(caseController)
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
  '/:id/referrals/:referralId/acknowledge',
  requirePermission(PERMISSIONS.REFERRAL_ACKNOWLEDGE),
  caseController.acknowledgeReferral.bind(caseController)
);

router.post(
  '/:id/referrals/:referralId/ownership',
  requirePermission(PERMISSIONS.REFERRAL_ACKNOWLEDGE),
  caseController.assignReferralOwnership.bind(caseController)
);

router.patch(
  '/:id/referrals/:referralId/status',
  requirePermission(PERMISSIONS.REFERRAL_ACKNOWLEDGE),
  caseController.updateReferralStatus.bind(caseController)
);

router.post(
  '/:id/referrals/:referralId/accept',
  requirePermission(PERMISSIONS.REFERRAL_ACCEPT),
  caseController.acceptReferral.bind(caseController)
);

// Sensitive Evidence Vault (Flow 3)
router.post(
  '/:id/evidence',
  requirePermission(PERMISSIONS.EVIDENCE_CREATE),
  caseController.createEvidence.bind(caseController)
);

router.get(
  '/:id/evidence',
  requirePermission(PERMISSIONS.EVIDENCE_READ),
  caseController.getEvidenceList.bind(caseController)
);

router.get(
  '/:id/evidence/:evidenceId',
  requirePermission(PERMISSIONS.EVIDENCE_READ),
  caseController.getEvidence.bind(caseController)
);

// Case Incidents
router.post(
  '/:id/incidents',
  requirePermission(PERMISSIONS.INCIDENT_LINK),
  caseController.createIncident.bind(caseController)
);

router.post(
  '/:id/link-incident',
  requirePermission(PERMISSIONS.INCIDENT_LINK),
  caseController.linkIncident.bind(caseController)
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

// Lawyer Assignment & Accountability (Flow 4)
router.post(
  '/:id/lawyer',
  requirePermission(PERMISSIONS.CASE_ASSIGN_LAWYER),
  caseController.assignLawyer.bind(caseController)
);

router.post(
  '/:id/lawyer/activity',
  requirePermission(PERMISSIONS.LAWYER_ACTIVITY_RECORD),
  caseController.recordLawyerActivity.bind(caseController)
);

router.post(
  '/:id/lawyer/escalate',
  requirePermission(PERMISSIONS.LAWYER_ESCALATE),
  caseController.escalateLawyer.bind(caseController)
);

// T2 Jurisdiction Decision (Ping-Pong Escalation Resolution)
router.patch(
  '/:id/jurisdiction-decision',
  requirePermission(PERMISSIONS.CASE_UPDATE_STATUS),
  caseController.decideJurisdiction.bind(caseController)
);

// T11 Secure E-Signature & Document Integrity
router.post(
  '/:id/sign',
  requirePermission(PERMISSIONS.CASE_SIGN),
  caseController.signDocument.bind(caseController)
);

router.get(
  '/:id/verify-signatures',
  requirePermission(PERMISSIONS.CASE_VERIFY_SIGNATURES),
  caseController.verifySignatures.bind(caseController)
);

// T7 Settlement Drafting Assistant
router.post(
  '/:id/draft-settlement',
  requirePermission(PERMISSIONS.CASE_DRAFT_SETTLEMENT),
  caseController.draftSettlement.bind(caseController)
);

router.post(
  '/:id/settlements/:settlementId/confirm',
  requirePermission(PERMISSIONS.CASE_CONFIRM_SETTLEMENT),
  caseController.confirmSettlement.bind(caseController)
);

// T6 Document Summarization & Checklist Agent
router.post(
  '/:id/documents/summarize',
  requirePermission(PERMISSIONS.CASE_SUMMARIZE_DOCS),
  caseController.summarizeDocuments.bind(caseController)
);

router.post(
  '/:id/documents/confirm-briefing',
  requirePermission(PERMISSIONS.CASE_CONFIRM_BRIEFING),
  caseController.confirmBriefing.bind(caseController)
);

router.post(
  '/:id/documents/briefings/:briefingId/confirm',
  requirePermission(PERMISSIONS.CASE_CONFIRM_BRIEFING),
  caseController.confirmBriefing.bind(caseController)
);

// T8 Multi-Agent Case Triage
router.post(
  '/:id/triage',
  requirePermission(PERMISSIONS.CASE_TRIAGE),
  caseController.triageCase.bind(caseController)
);

router.post(
  '/:id/triage/override',
  requirePermission(PERMISSIONS.CASE_TRIAGE_OVERRIDE),
  caseController.overrideTriage.bind(caseController)
);

router.post(
  '/:id/triage/:triageId/override',
  requirePermission(PERMISSIONS.CASE_TRIAGE_OVERRIDE),
  caseController.overrideTriage.bind(caseController)
);

module.exports = router;
