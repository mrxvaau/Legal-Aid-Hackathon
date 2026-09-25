const { getDb } = require('../db/connection');

class AuditRepository {
  create(entry) {
    const db = getDb();
    const payloadBefore = typeof entry.payload_before === 'object'
      ? JSON.stringify(entry.payload_before)
      : entry.payload_before || null;

    const payloadAfter = typeof entry.payload_after === 'object'
      ? JSON.stringify(entry.payload_after)
      : entry.payload_after || null;

    const stmt = db.prepare(`
      INSERT INTO audit_log (
        id, case_id, application_id, action, actor_id, actor_role,
        actor_ip, payload_before, payload_after, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.id,
      entry.case_id || null,
      entry.application_id || null,
      entry.action,
      entry.actor_id,
      entry.actor_role,
      entry.actor_ip || null,
      payloadBefore,
      payloadAfter,
      entry.notes || null
    );

    return this.findById(entry.id);
  }

  findById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM audit_log WHERE id = ?').get(id);
    if (row) {
      if (row.payload_before) {
        try { row.payload_before = JSON.parse(row.payload_before); } catch (e) {}
      }
      if (row.payload_after) {
        try { row.payload_after = JSON.parse(row.payload_after); } catch (e) {}
      }
    }
    return row;
  }

  listByCaseId(caseId) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM audit_log
      WHERE case_id = ?
      ORDER BY created_at DESC
    `).all(caseId);

    return rows.map(r => {
      if (r.payload_before) {
        try { r.payload_before = JSON.parse(r.payload_before); } catch (e) {}
      }
      if (r.payload_after) {
        try { r.payload_after = JSON.parse(r.payload_after); } catch (e) {}
      }
      return r;
    });
  }

  listByApplicationId(applicationId) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM audit_log
      WHERE application_id = ?
      ORDER BY created_at DESC
    `).all(applicationId);

    return rows.map(r => {
      if (r.payload_before) {
        try { r.payload_before = JSON.parse(r.payload_before); } catch (e) {}
      }
      if (r.payload_after) {
        try { r.payload_after = JSON.parse(r.payload_after); } catch (e) {}
      }
      return r;
    });
  }
}

module.exports = new AuditRepository();
