const caseService = require('../services/caseService');
const auditService = require('../services/auditService');
const provenanceService = require('../services/provenanceService');
const taskService = require('../services/taskService');
const referralService = require('../services/referralService');
const incidentService = require('../services/incidentService');
const safeContactService = require('../services/safeContactService');
const evidenceService = require('../services/evidenceService');
const lawyerAccountabilityService = require('../services/lawyerAccountabilityService');
const {
  validateCasePayload,
  validateTaskPayload,
  validateReferralPayload,
  validateIncidentPayload,
  validatePersonLinkPayload
} = require('../validators/schemas');

class CaseController {
  createCase(req, res, next) {
    try {
      const errors = validateCasePayload(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const caseData = caseService.createCase(req.body, req.user);
      res.status(201).json({ success: true, data: caseData });
    } catch (err) {
      next(err);
    }
  }

  getCase(req, res, next) {
    try {
      const { id } = req.params;
      const caseData = caseService.getCase(id, { includeAll: true }, req.user);
      if (!caseData) {
        return res.status(404).json({ success: false, message: `Case ${id} not found` });
      }
      res.json({ success: true, data: caseData });
    } catch (err) {
      next(err);
    }
  }

  listCases(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        intake_office: req.query.intake_office,
        search: req.query.search
      };
      const cases = caseService.listCases(filters);
      res.json({ success: true, data: cases, count: cases.length });
    } catch (err) {
      next(err);
    }
  }

  updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: 'status is required' });
      }
      const updated = caseService.updateStatus(id, status, req.user, notes);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // Events (Audit / State mutation)
  createEvent(req, res, next) {
    try {
      const { id } = req.params;
      const { action, notes, payload_before, payload_after } = req.body;
      if (!action) {
        return res.status(400).json({ success: false, message: 'action is required' });
      }

      const event = auditService.recordAuditEvent({
        case_id: id,
        action,
        actor_id: req.user.id,
        actor_role: req.user.role,
        payload_before,
        payload_after,
        notes
      });
      res.status(201).json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  }

  getEvents(req, res, next) {
    try {
      const { id } = req.params;
      const events = auditService.getAuditTrailForCase(id);
      res.json({ success: true, data: events, count: events.length });
    } catch (err) {
      next(err);
    }
  }

  // People
  addPerson(req, res, next) {
    try {
      const { id } = req.params;
      const errors = validatePersonLinkPayload(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const link = caseService.addPersonToCase(id, req.body, req.user);
      res.status(201).json({ success: true, data: link });
    } catch (err) {
      next(err);
    }
  }

  getPeople(req, res, next) {
    try {
      const { id } = req.params;
      const caseData = caseService.getCase(id, { includeAll: true }, req.user);
      if (!caseData) {
        return res.status(404).json({ success: false, message: `Case ${id} not found` });
      }
      res.json({ success: true, data: caseData.people, count: caseData.people.length });
    } catch (err) {
      next(err);
    }
  }

  // Safe Contacts (Flow 1: Moyuri protection mode)
  configureSafeContact(req, res, next) {
    try {
      const { id } = req.params;
      const {
        person_id,
        preferred_contact_method,
        unsafe_channels,
        safe_channel_details,
        restriction_reason,
        danger_level
      } = req.body;

      const sc = safeContactService.configureSafeContact({
        case_id: id,
        person_id,
        preferred_contact_method,
        unsafe_channels,
        safe_channel_details,
        restriction_reason,
        danger_level,
        actor: req.user
      });

      res.status(201).json({ success: true, data: sc });
    } catch (err) {
      next(err);
    }
  }

  getSafeContacts(req, res, next) {
    try {
      const { id } = req.params;
      const list = safeContactService.getSafeContactsForCase(id, req.user);
      res.json({ success: true, data: list, count: list.length });
    } catch (err) {
      next(err);
    }
  }

  // Tasks
  createTask(req, res, next) {
    try {
      const { id } = req.params;
      const errors = validateTaskPayload(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const task = taskService.createTask({
        case_id: id,
        title: req.body.title,
        title_bn: req.body.title_bn,
        description: req.body.description,
        assigned_to_role: req.body.assigned_to_role,
        assigned_to_user_id: req.body.assigned_to_user_id,
        due_date: req.body.due_date,
        priority: req.body.priority,
        actor: req.user
      });
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  getTasks(req, res, next) {
    try {
      const { id } = req.params;
      const tasks = taskService.getTasksForCase(id);
      res.json({ success: true, data: tasks, count: tasks.length });
    } catch (err) {
      next(err);
    }
  }

  // Referrals
  createReferral(req, res, next) {
    try {
      const { id } = req.params;
      const errors = validateReferralPayload(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const referral = referralService.createReferral({
        case_id: id,
        referral_type: req.body.referral_type,
        target_authority_type: req.body.target_authority_type || 'DLAO',
        referring_office: req.body.referring_office,
        receiving_office: req.body.receiving_office,
        referring_role: req.body.referring_role || req.user.role,
        receiving_role: req.body.receiving_role,
        reason: req.body.reason,
        reason_bn: req.body.reason_bn,
        notes: req.body.notes,
        actor: req.user
      });
      res.status(201).json({ success: true, data: referral });
    } catch (err) {
      next(err);
    }
  }

  getReferrals(req, res, next) {
    try {
      const { id } = req.params;
      const referrals = referralService.getReferralsForCase(id);
      res.json({ success: true, data: referrals, count: referrals.length });
    } catch (err) {
      next(err);
    }
  }

  acknowledgeReferral(req, res, next) {
    try {
      const { referralId } = req.params;
      const { assigned_officer_id, notes } = req.body;
      const acknowledged = referralService.acknowledgeReferral(
        referralId,
        assigned_officer_id || req.user.id,
        notes || null,
        req.user
      );
      res.json({ success: true, data: acknowledged });
    } catch (err) {
      next(err);
    }
  }

  assignReferralOwnership(req, res, next) {
    try {
      const { referralId } = req.params;
      const { assigned_officer_id, notes } = req.body;
      if (!assigned_officer_id) {
        return res.status(400).json({ success: false, message: 'assigned_officer_id is required' });
      }
      const updated = referralService.assignOwnership(referralId, assigned_officer_id, notes || null, req.user);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  updateReferralStatus(req, res, next) {
    try {
      const { referralId } = req.params;
      const { status, receiving_role, notes } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: 'status is required' });
      }
      const updated = referralService.updateReferralStatus(referralId, status, receiving_role || null, notes || null, req.user);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  acceptReferral(req, res, next) {
    try {
      const { referralId } = req.params;
      const accepted = referralService.acceptReferral(referralId, req.user.role, req.user);
      res.json({ success: true, data: accepted });
    } catch (err) {
      next(err);
    }
  }

  // Incidents
  createIncident(req, res, next) {
    try {
      const { id } = req.params;
      const errors = validateIncidentPayload(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const incident = incidentService.linkIncident({
        case_id: id,
        incident_type: req.body.incident_type,
        incident_date: req.body.incident_date,
        location: req.body.location,
        description: req.body.description,
        description_bn: req.body.description_bn,
        severity: req.body.severity,
        is_sensitive_evidence: req.body.is_sensitive_evidence || false,
        evidence_privacy_level: req.body.evidence_privacy_level || 'STANDARD',
        redacted_summary: req.body.redacted_summary || null,
        police_station_jurisdiction: req.body.police_station_jurisdiction,
        gd_or_fir_number: req.body.gd_or_fir_number,
        actor: req.user
      });
      res.status(201).json({ success: true, data: incident });
    } catch (err) {
      next(err);
    }
  }

  getIncidents(req, res, next) {
    try {
      const { id } = req.params;
      const incidents = incidentService.getIncidentsForCase(id);
      res.json({ success: true, data: incidents, count: incidents.length });
    } catch (err) {
      next(err);
    }
  }

  // Provenance
  createProvenance(req, res, next) {
    try {
      const { id } = req.params;
      const {
        entity_type = 'case',
        entity_id = id,
        field_name,
        source_type,
        source_language,
        target_language,
        is_secondhand_report = false,
        reported_for_person_id = null,
        source_details,
        raw_content,
        processed_content,
        confirmed_by
      } = req.body;

      const prov = provenanceService.recordProvenance({
        case_id: id,
        entity_type,
        entity_id,
        field_name,
        source_type,
        source_language,
        target_language,
        author_id: req.user.id,
        author_role: req.user.role,
        is_secondhand_report,
        reported_for_person_id,
        source_details,
        raw_content,
        processed_content,
        confirmed_by
      });

      res.status(201).json({ success: true, data: prov });
    } catch (err) {
      next(err);
    }
  }

  getProvenance(req, res, next) {
    try {
      const { id } = req.params;
      const provs = provenanceService.getProvenanceForCase(id);
      res.json({ success: true, data: provs, count: provs.length });
    } catch (err) {
      next(err);
    }
  }

  confirmProvenance(req, res, next) {
    try {
      const { provId } = req.params;
      const updated = provenanceService.confirmProvenance(provId, req.user.id);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // Assign Lawyer
  assignLawyer(req, res, next) {
    try {
      const { id } = req.params;
      const { lawyer_id } = req.body;
      if (!lawyer_id) {
        return res.status(400).json({ success: false, message: 'lawyer_id is required' });
      }

      const updatedCase = caseService.assignLawyer(id, lawyer_id, req.user);
      res.json({ success: true, data: updatedCase });
    } catch (err) {
      next(err);
    }
  }

  // Sensitive Evidence Vault (Flow 3)
  createEvidence(req, res, next) {
    try {
      const { id } = req.params;
      const {
        evidence_type,
        title,
        title_bn,
        original_filename,
        mime_type,
        file_size_bytes,
        hash_checksum,
        storage_ref,
        sensitivity_level,
        access_restrictions,
        evidence_status,
        chain_of_custody_notes,
        raw_content,
        incident_id
      } = req.body;

      if (!evidence_type || !title || !original_filename || !mime_type) {
        return res.status(400).json({
          success: false,
          message: 'evidence_type, title, original_filename, and mime_type are required'
        });
      }

      const evidence = evidenceService.registerEvidence({
        case_id: id,
        incident_id,
        evidence_type,
        title,
        title_bn,
        original_filename,
        mime_type,
        file_size_bytes,
        hash_checksum,
        storage_ref,
        sensitivity_level,
        access_restrictions,
        evidence_status,
        chain_of_custody_notes,
        raw_content,
        actor: req.user
      });

      res.status(201).json({ success: true, data: evidence });
    } catch (err) {
      next(err);
    }
  }

  getEvidenceList(req, res, next) {
    try {
      const { id } = req.params;
      const list = evidenceService.getEvidenceForCase(id, req.user);
      res.json({ success: true, data: list, count: list.length });
    } catch (err) {
      next(err);
    }
  }

  getEvidence(req, res, next) {
    try {
      const { evidenceId } = req.params;
      const evidence = evidenceService.getEvidenceById(evidenceId, req.user);
      res.json({ success: true, data: evidence });
    } catch (err) {
      next(err);
    }
  }

  // Flow 4: Lawyer Accountability & Silence Monitoring
  recordLawyerActivity(req, res, next) {
    try {
      const { id } = req.params;
      const updatedCase = lawyerAccountabilityService.recordActivity(id, req.body, req.user);
      res.json({ success: true, data: updatedCase, message: 'Lawyer activity recorded successfully' });
    } catch (err) {
      next(err);
    }
  }

  escalateLawyer(req, res, next) {
    try {
      const { id } = req.params;
      const result = lawyerAccountabilityService.escalateLawyer(id, req.body, req.user);
      res.json({ success: true, data: result, message: 'Case lawyer accountability escalated' });
    } catch (err) {
      next(err);
    }
  }

  // Flow 4: Non-Smartphone Citizen Status Query
  getCitizenStatus(req, res, next) {
    try {
      const queryTerm = req.query.query || req.body?.query || req.query.inquiry_code || req.query.case_number;
      if (!queryTerm) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter required',
          message: 'Please provide an Application ID, Case Number, or Citizen Inquiry Code'
        });
      }

      const statusData = lawyerAccountabilityService.getCitizenStatus(queryTerm, req.user);
      if (!statusData) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `No active legal aid case found matching query '${queryTerm}'`
        });
      }

      res.json({ success: true, data: statusData });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CaseController();
