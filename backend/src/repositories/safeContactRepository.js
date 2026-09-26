const { getDb } = require('../db/connection');

class SafeContactRepository {
  create(sc) {
    const db = getDb();
    const unsafeChannelsJson = Array.isArray(sc.unsafe_channels)
      ? JSON.stringify(sc.unsafe_channels)
      : (typeof sc.unsafe_channels === 'string' ? sc.unsafe_channels : JSON.stringify([]));

    const stmt = db.prepare(`
      INSERT INTO safe_contacts (
        id, case_id, person_id, is_safe_contact_active, preferred_contact_method,
        unsafe_channels, safe_channel_details, restriction_reason, danger_level,
        confidentiality_notice, configured_by_id, configured_by_role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        is_safe_contact_active = excluded.is_safe_contact_active,
        preferred_contact_method = excluded.preferred_contact_method,
        unsafe_channels = excluded.unsafe_channels,
        safe_channel_details = excluded.safe_channel_details,
        restriction_reason = excluded.restriction_reason,
        danger_level = excluded.danger_level,
        confidentiality_notice = excluded.confidentiality_notice,
        updated_at = datetime('now')
    `);

    stmt.run(
      sc.id,
      sc.case_id,
      sc.person_id,
      sc.is_safe_contact_active !== false ? 1 : 0,
      sc.preferred_contact_method,
      unsafeChannelsJson,
      sc.safe_channel_details || null,
      sc.restriction_reason,
      sc.danger_level || 'HIGH',
      sc.confidentiality_notice || 'RESTRICTED_ACCESS: Survivor Protection Protocol Active',
      sc.configured_by_id,
      sc.configured_by_role
    );

    return this.findById(sc.id);
  }

  findById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM safe_contacts WHERE id = ?').get(id);
    if (row && row.unsafe_channels) {
      try { row.unsafe_channels = JSON.parse(row.unsafe_channels); } catch (e) {}
    }
    return row;
  }

  findByCaseId(caseId) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT sc.*, p.full_name AS person_name, p.full_name_bn AS person_name_bn
      FROM safe_contacts sc
      JOIN people p ON sc.person_id = p.id
      WHERE sc.case_id = ?
    `).all(caseId);

    return rows.map(r => {
      if (r.unsafe_channels) {
        try { r.unsafe_channels = JSON.parse(r.unsafe_channels); } catch (e) {}
      }
      return r;
    });
  }
}

module.exports = new SafeContactRepository();
