const { getDb } = require('../db/connection');

class ReferralRepository {
  create(ref) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO referrals (
        id, case_id, referral_type, referring_office, receiving_office,
        referring_role, receiving_role, status, reason, reason_bn, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      ref.id,
      ref.case_id,
      ref.referral_type,
      ref.referring_office,
      ref.receiving_office,
      ref.referring_role,
      ref.receiving_role || null,
      ref.status || 'PENDING',
      ref.reason,
      ref.reason_bn || null,
      ref.notes || null
    );

    return this.findById(ref.id);
  }

  findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM referrals WHERE id = ?').get(id);
  }

  updateStatus(id, newStatus, receivingRole = null) {
    const db = getDb();
    const isAccepted = newStatus === 'ACCEPTED';
    const acceptedAt = isAccepted ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE referrals
      SET status = ?,
          receiving_role = COALESCE(?, receiving_role),
          accepted_at = CASE WHEN ? = 'ACCEPTED' THEN datetime('now') ELSE accepted_at END,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, receivingRole, newStatus, id);

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
