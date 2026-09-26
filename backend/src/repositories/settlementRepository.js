const crypto = require('crypto');
const { getDb } = require('../db/connection');

class SettlementRepository {
  create({
    id = null,
    case_id,
    template_type = 'ADR_GENERAL',
    title,
    terms_json,
    inconsistencies_json = '[]',
    status = 'DRAFT',
    created_by_id,
    created_by_role,
    notes = null
  }) {
    const db = getDb();
    const settlementId = id || `SETTLE-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const termsStr = typeof terms_json === 'string' ? terms_json : JSON.stringify(terms_json);
    const inconsistenciesStr = typeof inconsistencies_json === 'string' ? inconsistencies_json : JSON.stringify(inconsistencies_json);

    const stmt = db.prepare(`
      INSERT INTO settlement_drafts (
        id, case_id, template_type, title, terms_json,
        inconsistencies_json, status, created_by_id, created_by_role,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      settlementId,
      case_id,
      template_type,
      title,
      termsStr,
      inconsistenciesStr,
      status,
      created_by_id,
      created_by_role,
      notes,
      now,
      now
    );

    return this.findById(settlementId);
  }

  findById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM settlement_drafts WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      terms: JSON.parse(row.terms_json || '{}'),
      inconsistencies: JSON.parse(row.inconsistencies_json || '[]')
    };
  }

  findByCaseId(caseId) {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM settlement_drafts WHERE case_id = ? ORDER BY created_at DESC').all(caseId);
    return rows.map(row => ({
      ...row,
      terms: JSON.parse(row.terms_json || '{}'),
      inconsistencies: JSON.parse(row.inconsistencies_json || '[]')
    }));
  }

  updateStatus(id, { status, confirmed_by_id, confirmed_by_role, confirmed_at = null, notes = null }) {
    const db = getDb();
    const now = new Date().toISOString();
    const confirmedTime = confirmed_at || now;

    db.prepare(`
      UPDATE settlement_drafts
      SET status = ?,
          confirmed_by_id = ?,
          confirmed_by_role = ?,
          confirmed_at = ?,
          notes = COALESCE(?, notes),
          updated_at = ?
      WHERE id = ?
    `).run(status, confirmed_by_id, confirmed_by_role, confirmedTime, notes, now, id);

    return this.findById(id);
  }
}

module.exports = new SettlementRepository();
