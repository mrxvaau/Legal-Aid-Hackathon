const { getDb } = require('../db/connection');

class ReferralRepository {
  create(ref) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO referrals (
        id, case_id, referral_type, target_authority_type, referring_office, receiving_office,
        referring_role, receiving_role, status, acknowledgement_status, assigned_officer_id,
        reason, reason_bn, notes, transfer_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      ref.id,
      ref.case_id,
      ref.referral_type,
      ref.target_authority_type || 'DLAO',
      ref.referring_office,
      ref.receiving_office,
      ref.referring_role,
      ref.receiving_role || null,
      ref.status || 'PENDING',
      ref.acknowledgement_status || 'UNACKNOWLEDGED',
      ref.assigned_officer_id || null,
      ref.reason,
      ref.reason_bn || null,
      ref.notes || null,
      ref.transfer_count || 1
    );

    return this.findById(ref.id);
  }

  countByCaseId(caseId) {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM referrals WHERE case_id = ?').get(caseId);
    return row ? row.count : 0;
  }

  findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM referrals WHERE id = ?').get(id);
  }

  acknowledge(id, assignedOfficerId, notes = null) {
    const db = getDb();
    db.prepare(`
      UPDATE referrals
      SET acknowledgement_status = 'ACKNOWLEDGED',
          status = CASE WHEN status = 'PENDING' OR status = 'TRANSMITTED' THEN 'ACKNOWLEDGED' ELSE status END,
          assigned_officer_id = COALESCE(?, assigned_officer_id),
          notes = CASE WHEN ? IS NOT NULL THEN (COALESCE(notes, '') || ' | Acknowledgement Note: ' || ?) ELSE notes END,
          acknowledged_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(assignedOfficerId || null, notes, notes, id);

    return this.findById(id);
  }

  assignOwnership(id, assignedOfficerId, notes = null) {
    const db = getDb();
    db.prepare(`
      UPDATE referrals
      SET assigned_officer_id = ?,
          notes = CASE WHEN ? IS NOT NULL THEN (COALESCE(notes, '') || ' | Ownership Reassigned: ' || ?) ELSE notes END,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(assignedOfficerId, notes, notes, id);

    return this.findById(id);
  }

  updateStatus(id, newStatus, receivingRole = null, notes = null) {
    const db = getDb();
    db.prepare(`
      UPDATE referrals
      SET status = ?,
          receiving_role = COALESCE(?, receiving_role),
          notes = CASE WHEN ? IS NOT NULL THEN (COALESCE(notes, '') || ' | Status: ' || ?) ELSE notes END,
          accepted_at = CASE WHEN ? = 'ACCEPTED' THEN datetime('now') ELSE accepted_at END,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, receivingRole, notes, notes, newStatus, id);

    return this.findById(id);
  }

  listByCaseId(caseId) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM referrals
      WHERE case_id = ?
      ORDER BY created_at DESC
    `).all(caseId);
  }
}

module.exports = new ReferralRepository();
