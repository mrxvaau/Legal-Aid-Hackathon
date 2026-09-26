const { getDb } = require('../db/connection');

class EvidenceRepository {
  create(ev) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO evidence_vault (
        id, case_id, incident_id, evidence_type, title, title_bn,
        original_filename, mime_type, file_size_bytes, hash_checksum,
        storage_ref, sensitivity_level, access_restrictions,
        evidence_status, submitted_by_id, submitted_by_role,
        submitted_at, chain_of_custody_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      ev.id,
      ev.case_id,
      ev.incident_id || null,
      ev.evidence_type,
      ev.title,
      ev.title_bn || null,
      ev.original_filename,
      ev.mime_type,
      ev.file_size_bytes || null,
      ev.hash_checksum,
      ev.storage_ref,
      ev.sensitivity_level || 'CONFIDENTIAL',
      typeof ev.access_restrictions === 'object' ? JSON.stringify(ev.access_restrictions) : (ev.access_restrictions || null),
      ev.evidence_status || 'REGISTERED',
      ev.submitted_by_id,
      ev.submitted_by_role,
      ev.submitted_at || new Date().toISOString(),
      ev.chain_of_custody_notes || null
    );

    return this.findById(ev.id);
  }

  findById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM evidence_vault WHERE id = ?').get(id);
    if (!row) return null;
    return this._formatRow(row);
  }

  listByCaseId(caseId) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM evidence_vault
      WHERE case_id = ?
      ORDER BY created_at DESC
    `).all(caseId);

    return rows.map(r => this._formatRow(r));
  }

  updateStatus(id, newStatus) {
    const db = getDb();
    db.prepare(`
      UPDATE evidence_vault
      SET evidence_status = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, id);

    return this.findById(id);
  }

  _formatRow(row) {
    if (!row) return null;
    let accessRestrictions = [];
    if (row.access_restrictions) {
      try {
        accessRestrictions = JSON.parse(row.access_restrictions);
      } catch (e) {
        accessRestrictions = [row.access_restrictions];
      }
    }
    return {
      ...row,
      access_restrictions: accessRestrictions
    };
  }
}

module.exports = new EvidenceRepository();
