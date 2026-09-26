const crypto = require('crypto');
const { getDb } = require('../db/connection');

class BriefingRepository {
  create({
    id = null,
    case_id,
    summary_json,
    missing_items_json = '[]',
    is_confirmed_by_officer = 0,
    officer_notes = null
  }) {
    const db = getDb();
    const briefingId = id || `BRIEF-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const summaryStr = typeof summary_json === 'string' ? summary_json : JSON.stringify(summary_json);
    const missingStr = typeof missing_items_json === 'string' ? missing_items_json : JSON.stringify(missing_items_json);

    const stmt = db.prepare(`
      INSERT INTO document_briefings (
        id, case_id, summary_json, missing_items_json,
        is_confirmed_by_officer, officer_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      briefingId,
      case_id,
      summaryStr,
      missingStr,
      is_confirmed_by_officer ? 1 : 0,
      officer_notes,
      now
    );

    return this.findById(briefingId);
  }

  findById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM document_briefings WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      summary: JSON.parse(row.summary_json || '[]'),
      missing_items: JSON.parse(row.missing_items_json || '[]')
    };
  }

  findByCaseId(caseId) {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM document_briefings WHERE case_id = ? ORDER BY created_at DESC').all(caseId);
    return rows.map(row => ({
      ...row,
      summary: JSON.parse(row.summary_json || '[]'),
      missing_items: JSON.parse(row.missing_items_json || '[]')
    }));
  }

  confirmBriefing(id, { confirmed_by_id, officer_notes = null }) {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE document_briefings
      SET is_confirmed_by_officer = 1,
          confirmed_by_id = ?,
          confirmed_at = ?,
          officer_notes = COALESCE(?, officer_notes)
      WHERE id = ?
    `).run(confirmed_by_id, now, officer_notes, id);

    return this.findById(id);
  }
}

module.exports = new BriefingRepository();
