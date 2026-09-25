const { getDb } = require('../db/connection');

class ProvenanceRepository {
  create(entry) {
    const db = getDb();
    const sourceDetails = typeof entry.source_details === 'object'
      ? JSON.stringify(entry.source_details)
      : entry.source_details || null;

    const stmt = db.prepare(`
      INSERT INTO provenance_log (
        id, case_id, application_id, entity_type, entity_id, field_name,
        source_type, source_language, target_language, author_id, author_role,
        source_details, raw_content, processed_content, confirmed_by, confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.id,
      entry.case_id || null,
      entry.application_id || null,
      entry.entity_type,
      entry.entity_id,
      entry.field_name,
      entry.source_type,
      entry.source_language || null,
      entry.target_language || null,
      entry.author_id || null,
      entry.author_role,
      sourceDetails,
      entry.raw_content || null,
      entry.processed_content || null,
      entry.confirmed_by || null,
      entry.confirmed_at || null
    );

    return this.findById(entry.id);
  }

  findById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM provenance_log WHERE id = ?').get(id);
    if (row && row.source_details) {
      try { row.source_details = JSON.parse(row.source_details); } catch (e) {}
    }
    return row;
  }

  confirmHuman(id, confirmedBy) {
    const db = getDb();
    db.prepare(`
      UPDATE provenance_log
      SET confirmed_by = ?, confirmed_at = datetime('now')
      WHERE id = ?
    `).run(confirmedBy, id);

    return this.findById(id);
  }

  listByCaseId(caseId) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM provenance_log
      WHERE case_id = ?
      ORDER BY created_at ASC
    `).all(caseId);

    return rows.map(r => {
      if (r.source_details) {
        try { r.source_details = JSON.parse(r.source_details); } catch (e) {}
      }
      return r;
    });
  }

  listByEntity(entityType, entityId) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM provenance_log
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at ASC
    `).all(entityType, entityId);

    return rows.map(r => {
      if (r.source_details) {
        try { r.source_details = JSON.parse(r.source_details); } catch (e) {}
      }
      return r;
    });
  }
}

module.exports = new ProvenanceRepository();
