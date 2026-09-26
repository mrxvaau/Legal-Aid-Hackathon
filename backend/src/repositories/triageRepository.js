const crypto = require('crypto');
const { getDb } = require('../db/connection');

class TriageRepository {
  create({
    id = null,
    case_id,
    categorization_result,
    risk_result,
    jurisdiction_result,
    completeness_result,
    has_conflict = 0,
    conflict_details = null,
    recommended_priority,
    recommended_authority,
    recommended_action,
    final_priority,
    final_authority,
    is_overridden = 0,
    override_reason = null,
    reviewed_by_id = null
  }) {
    const db = getDb();
    const triageId = id || `TRG-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const catStr = typeof categorization_result === 'string' ? categorization_result : JSON.stringify(categorization_result);
    const riskStr = typeof risk_result === 'string' ? risk_result : JSON.stringify(risk_result);
    const jurStr = typeof jurisdiction_result === 'string' ? jurisdiction_result : JSON.stringify(jurisdiction_result);
    const compStr = typeof completeness_result === 'string' ? completeness_result : JSON.stringify(completeness_result);
    const confStr = conflict_details ? (typeof conflict_details === 'string' ? conflict_details : JSON.stringify(conflict_details)) : null;

    const stmt = db.prepare(`
      INSERT INTO case_triage_results (
        id, case_id, categorization_result, risk_result, jurisdiction_result,
        completeness_result, has_conflict, conflict_details, recommended_priority,
        recommended_authority, recommended_action, final_priority, final_authority,
        is_overridden, override_reason, reviewed_by_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      triageId,
      case_id,
      catStr,
      riskStr,
      jurStr,
      compStr,
      has_conflict ? 1 : 0,
      confStr,
      recommended_priority,
      recommended_authority,
      recommended_action,
      final_priority,
      final_authority,
      is_overridden ? 1 : 0,
      override_reason,
      reviewed_by_id,
      now
    );

    return this.findById(triageId);
  }

  findById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM case_triage_results WHERE id = ?').get(id);
    if (!row) return null;
    return this._formatRow(row);
  }

  findByCaseId(caseId) {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM case_triage_results WHERE case_id = ? ORDER BY created_at DESC').all(caseId);
    return rows.map(r => this._formatRow(r));
  }

  recordOverride(id, { override_priority, override_authority, override_reason, reviewed_by_id }) {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE case_triage_results
      SET is_overridden = 1,
          final_priority = COALESCE(?, final_priority),
          final_authority = COALESCE(?, final_authority),
          override_reason = ?,
          reviewed_by_id = ?,
          reviewed_at = ?
      WHERE id = ?
    `).run(override_priority, override_authority, override_reason, reviewed_by_id, now, id);

    return this.findById(id);
  }

  _formatRow(row) {
    return {
      ...row,
      categorization: JSON.parse(row.categorization_result || '{}'),
      risk: JSON.parse(row.risk_result || '{}'),
      jurisdiction: JSON.parse(row.jurisdiction_result || '{}'),
      completeness: JSON.parse(row.completeness_result || '{}'),
      conflict_details: row.conflict_details ? JSON.parse(row.conflict_details) : null,
      has_conflict: Boolean(row.has_conflict),
      is_overridden: Boolean(row.is_overridden)
    };
  }
}

module.exports = new TriageRepository();
