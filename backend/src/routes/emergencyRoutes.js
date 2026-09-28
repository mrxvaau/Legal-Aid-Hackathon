const express = require('express');
const router = express.Router();
const { getDb } = require('../db/connection');
const auditService = require('../services/auditService');
const idGenerator = require('../utils/idGenerator');
const { ROLES } = require('../utils/constants');

// Ensure emergency_alerts table and indexes exist
function initEmergencySchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS emergency_alerts (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      case_id TEXT NOT NULL,
      application_id TEXT,
      person_id TEXT NOT NULL,
      person_name TEXT,
      source_channel TEXT NOT NULL DEFAULT 'CITIZEN_PORTAL',
      priority TEXT NOT NULL DEFAULT 'URGENT',
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED')),
      safe_contact_active INTEGER NOT NULL DEFAULT 0,
      safe_contact_details TEXT,
      unsafe_channels_json TEXT,
      preferred_contact_method TEXT,
      notes TEXT,
      acknowledged_at TEXT,
      acknowledged_by TEXT,
      acknowledged_by_role TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_emergency_case ON emergency_alerts(case_id);
    CREATE INDEX IF NOT EXISTS idx_emergency_person ON emergency_alerts(person_id);
  `);
}

// Initialize on module load
try {
  initEmergencySchema();
} catch (e) {
  console.warn('[EmergencyRoutes] Schema init warning:', e.message);
}

/**
 * Helper: Find or create case & evaluate safe contact
 */
function resolveEmergencyContext(db, citizenId, caseId, appId) {
  let resolvedCaseId = caseId;
  let resolvedAppId = appId;
  let person = null;

  if (citizenId) {
    person = db.prepare('SELECT * FROM people WHERE id = ?').get(citizenId);
  }

  // If no caseId passed, look up citizen's active case
  if (!resolvedCaseId && citizenId) {
    const caseRow = db.prepare(`
      SELECT c.id as case_id, c.application_id
      FROM cases c
      JOIN applications a ON c.application_id = a.id
      WHERE a.applicant_id = ? OR a.representative_id = ?
      ORDER BY c.created_at DESC LIMIT 1
    `).get(citizenId, citizenId);

    if (caseRow) {
      resolvedCaseId = caseRow.case_id;
      resolvedAppId = caseRow.application_id;
    }
  }

  // Fallback to seeded case 1 if still not resolved
  if (!resolvedCaseId) {
    const defaultCase = db.prepare('SELECT id, application_id FROM cases ORDER BY created_at ASC LIMIT 1').get();
    if (defaultCase) {
      resolvedCaseId = defaultCase.id;
      resolvedAppId = defaultCase.application_id;
    } else {
      // Create an emergency intake application and case so foreign keys never fail
      resolvedAppId = idGenerator.applicationId();
      resolvedCaseId = idGenerator.caseId();
      const pId = citizenId || 'PER-EMERGENCY-GUEST';
      if (!person) {
        db.prepare(`
          INSERT OR IGNORE INTO people (id, full_name, district, division)
          VALUES (?, 'Emergency Citizen Guest', 'Dhaka', 'Dhaka')
        `).run(pId);
      }
      db.prepare(`
        INSERT INTO applications (id, applicant_id, category, intake_channel, intake_office, status, summary, created_by_role)
        VALUES (?, ?, 'CRISIS_EMERGENCY', 'EMERGENCY_BUTTON', 'DLAO Dhaka', 'SUBMITTED', 'Direct emergency danger alert received', 'CITIZEN_APPLICANT')
      `).run(resolvedAppId, pId);

      db.prepare(`
        INSERT INTO cases (id, application_id, case_number, title, category, status, priority, intake_office)
        VALUES (?, ?, ?, 'EMERGENCY DANGER ALERT', 'CRISIS_EMERGENCY', 'NEW', 'URGENT', 'DLAO Dhaka')
      `).run(resolvedCaseId, resolvedAppId, `CAS-EMG-${Date.now().toString().slice(-6)}`);
    }
  }

  // Check Safe Contact Protocol
  const safeContact = db.prepare(`
    SELECT * FROM safe_contacts
    WHERE (case_id = ? OR person_id = ?) AND is_safe_contact_active = 1
    ORDER BY created_at DESC LIMIT 1
  `).get(resolvedCaseId, citizenId || '');

  return {
    caseId: resolvedCaseId,
    appId: resolvedAppId,
    person,
    safeContact
  };
}

/**
 * POST /api/emergency/alert
 * Triggers a real high-priority emergency alert with audit trail and safe contact guardrail
 */
router.post('/alert', (req, res, next) => {
  try {
    initEmergencySchema();
    const db = getDb();
    const {
      citizen_id,
      case_id,
      application_id,
      source_channel = 'CITIZEN_PORTAL',
      danger_notes = 'Immediate safety assistance requested via Emergency / Danger Alert button'
    } = req.body;

    const actorId = req.user?.id || citizen_id || 'PER-CITIZEN-MOYURI';
    const actorRole = req.user?.role || 'CITIZEN_APPLICANT';

    // 1. Resolve case & safe contact
    const { caseId, appId, person, safeContact } = resolveEmergencyContext(db, actorId, case_id, application_id);

    const isSafeContactActive = safeContact ? 1 : 0;
    const preferredMethod = safeContact?.preferred_contact_method || 'STANDARD_OFFICE_VISIT';
    const safeDetails = safeContact?.safe_channel_details || '';
    let unsafeChannels = [];
    if (safeContact?.unsafe_channels) {
      try {
        unsafeChannels = typeof safeContact.unsafe_channels === 'string'
          ? JSON.parse(safeContact.unsafe_channels)
          : safeContact.unsafe_channels;
      } catch (e) {
        unsafeChannels = [safeContact.unsafe_channels];
      }
    }

    const alertId = `EMG-${Date.now().toString().slice(-6)}`;
    const taskId = idGenerator.taskId();
    const personDisplayName = person?.full_name || (actorId === 'PER-CITIZEN-MOYURI' ? 'Moyuri Akter' : (actorId === 'PER-CITIZEN-RIPON' ? 'Ripon (Rep)' : 'Citizen Applicant'));

    // Safe Contact Guardrail: construct clear directive for officers
    let safeContactNotice = '';
    if (isSafeContactActive) {
      safeContactNotice = `🛡️ [SAFE CONTACT ACTIVE: DO NOT CALL UNSAFE CHANNELS (${unsafeChannels.join(', ')}). Preferred contact: ${preferredMethod}. Details: ${safeDetails}]`;
    }

    const taskTitle = `🚨 জরুরি বিপদ সংকেত: ${personDisplayName}`;
    const taskTitleBn = `🚨 জরুরি বিপদ সংকেত: ${personDisplayName} — ডিএলএও কর্মকর্তার তাৎক্ষণিক পদক্ষেপ প্রয়োজন`;
    const taskDescription = `EMERGENCY ALERT triggered via ${source_channel}. Citizen: ${personDisplayName} (${actorId}).\n${safeContactNotice}\nAlert Notes: ${danger_notes}\nSLA: 5-minute initial officer acknowledgement required.`;

    // 2. Insert into tasks table (Real DB write linked to case)
    db.prepare(`
      INSERT INTO tasks (
        id, case_id, title, title_bn, description, assigned_to_role,
        priority, status, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, 'URGENT', 'PENDING', datetime('now', '+5 minutes'))
    `).run(
      taskId,
      caseId,
      taskTitle,
      taskTitleBn,
      taskDescription,
      ROLES.B1_DLAO_OFFICER
    );

    // 3. Insert into emergency_alerts table
    db.prepare(`
      INSERT INTO emergency_alerts (
        id, task_id, case_id, application_id, person_id, person_name,
        source_channel, priority, status, safe_contact_active,
        safe_contact_details, unsafe_channels_json, preferred_contact_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'URGENT', 'PENDING', ?, ?, ?, ?, ?)
    `).run(
      alertId,
      taskId,
      caseId,
      appId,
      actorId,
      personDisplayName,
      source_channel,
      isSafeContactActive,
      safeDetails,
      JSON.stringify(unsafeChannels),
      preferredMethod,
      danger_notes
    );

    // 4. Update case priority to URGENT
    try {
      db.prepare(`UPDATE cases SET priority = 'URGENT', updated_at = datetime('now') WHERE id = ?`).run(caseId);
    } catch (e) {}

    // 5. Write REAL audit_log entry
    const auditRecord = auditService.recordAuditEvent({
      case_id: caseId,
      application_id: appId,
      action: 'emergency_alert_triggered',
      actor_id: actorId,
      actor_role: actorRole,
      payload_after: {
        alert_id: alertId,
        task_id: taskId,
        case_id: caseId,
        priority: 'URGENT',
        source_channel,
        safe_contact_active: isSafeContactActive,
        preferred_contact_method: preferredMethod,
        unsafe_channels: unsafeChannels
      },
      notes: `Emergency danger alert triggered by ${personDisplayName} via ${source_channel}. DLAO Officers notified. Safe contact protection: ${isSafeContactActive ? 'ENFORCED' : 'NONE'}.`
    });

    res.status(201).json({
      success: true,
      message: 'Emergency alert successfully transmitted to DLAO officer dispatch queue.',
      data: {
        alert_id: alertId,
        task_id: taskId,
        case_id: caseId,
        application_id: appId,
        status: 'PENDING',
        priority: 'URGENT',
        safe_contact_active: isSafeContactActive,
        preferred_contact_method: preferredMethod,
        unsafe_channels: unsafeChannels,
        audit_id: auditRecord.id,
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/emergency/alerts
 * Lists active emergency alerts for DLAO Officers with escalation status
 */
router.get('/alerts', (req, res, next) => {
  try {
    initEmergencySchema();
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        e.*,
        c.case_number,
        c.title as case_title,
        c.intake_office,
        t.status as task_status,
        t.due_date as task_due_date
      FROM emergency_alerts e
      LEFT JOIN cases c ON e.case_id = c.id
      LEFT JOIN tasks t ON e.task_id = t.id
      ORDER BY 
        CASE e.status 
          WHEN 'PENDING' THEN 1 
          WHEN 'ESCALATED' THEN 2 
          WHEN 'ACKNOWLEDGED' THEN 3 
          ELSE 4 
        END,
        e.created_at DESC
    `).all();

    const now = Date.now();
    const enriched = rows.map(r => {
      let unsafeChannels = [];
      try {
        if (r.unsafe_channels_json) unsafeChannels = JSON.parse(r.unsafe_channels_json);
      } catch (e) {}

      // Calculate demo SLA escalation (5 minutes window)
      const createdMs = new Date(r.created_at).getTime();
      const minutesElapsed = (now - createdMs) / (60 * 1000);
      const isOverdue = r.status === 'PENDING' && minutesElapsed >= 5;

      return {
        ...r,
        unsafe_channels: unsafeChannels,
        minutes_elapsed: Math.round(minutesElapsed * 10) / 10,
        is_escalated: isOverdue || r.status === 'ESCALATED',
        display_status: isOverdue ? 'ESCALATION_OVERDUE' : r.status
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      pending_count: enriched.filter(a => a.status === 'PENDING').length,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/emergency/alerts/:id/acknowledge
 * Officer acknowledgement action: writes audit entry and marks in-progress
 */
router.post('/alerts/:id/acknowledge', (req, res, next) => {
  try {
    initEmergencySchema();
    const db = getDb();
    const { id } = req.params;
    const actor = req.user || { id: 'PER-OFFICER-B1', role: ROLES.B1_DLAO_OFFICER, name: 'DLAO Officer' };

    const alert = db.prepare('SELECT * FROM emergency_alerts WHERE id = ?').get(id);
    if (!alert) {
      return res.status(404).json({ success: false, message: `Emergency alert ${id} not found` });
    }

    // Update alert
    db.prepare(`
      UPDATE emergency_alerts
      SET status = 'ACKNOWLEDGED',
          acknowledged_at = datetime('now'),
          acknowledged_by = ?,
          acknowledged_by_role = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(actor.id, actor.role, id);

    // Update corresponding task to IN_PROGRESS
    if (alert.task_id) {
      db.prepare(`
        UPDATE tasks
        SET status = 'IN_PROGRESS',
            updated_at = datetime('now')
        WHERE id = ?
      `).run(alert.task_id);
    }

    // Write REAL audit_log entry
    const auditRecord = auditService.recordAuditEvent({
      case_id: alert.case_id,
      application_id: alert.application_id,
      action: 'emergency_alert_acknowledged',
      actor_id: actor.id,
      actor_role: actor.role,
      payload_after: {
        alert_id: id,
        task_id: alert.task_id,
        status: 'ACKNOWLEDGED',
        acknowledged_by: actor.id,
        acknowledged_by_name: actor.name || actor.id,
        acknowledged_at: new Date().toISOString()
      },
      notes: `DLAO Officer ${actor.name || actor.id} (${actor.role}) formally acknowledged and initiated review of emergency danger alert ${id}.`
    });

    const updatedAlert = db.prepare('SELECT * FROM emergency_alerts WHERE id = ?').get(id);

    res.json({
      success: true,
      message: 'Emergency alert successfully acknowledged and recorded in audit log.',
      data: updatedAlert,
      audit_id: auditRecord.id
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
