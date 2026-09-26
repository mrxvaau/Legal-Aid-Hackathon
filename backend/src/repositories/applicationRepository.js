const { getDb } = require('../db/connection');

class ApplicationRepository {
  findById(id) {
    const db = getDb();
    const row = db.prepare(`
      SELECT 
        a.*,
        p.full_name AS applicant_name,
        p.full_name_bn AS applicant_name_bn,
        p.phone AS applicant_phone,
        p.district AS applicant_district,
        rep.full_name AS representative_name,
        rep.full_name_bn AS representative_name_bn,
        rep.phone AS representative_phone,
        c.id AS linked_case_id,
        c.case_number AS linked_case_number,
        c.status AS linked_case_status
      FROM applications a
      JOIN people p ON a.applicant_id = p.id
      LEFT JOIN people rep ON a.representative_id = rep.id
      LEFT JOIN cases c ON c.application_id = a.id
      WHERE a.id = ?
    `).get(id);

    if (row && row.details_json) {
      try {
        row.details = JSON.parse(row.details_json);
      } catch (e) {
        row.details = {};
      }
    }
    return row;
  }

  findByClientRequestId(clientRequestId) {
    if (!clientRequestId) return null;
    const db = getDb();
    const row = db.prepare(`
      SELECT 
        a.*,
        p.full_name AS applicant_name,
        p.full_name_bn AS applicant_name_bn,
        p.phone AS applicant_phone,
        p.district AS applicant_district,
        rep.full_name AS representative_name,
        rep.full_name_bn AS representative_name_bn,
        rep.phone AS representative_phone,
        c.id AS linked_case_id,
        c.case_number AS linked_case_number,
        c.status AS linked_case_status
      FROM applications a
      JOIN people p ON a.applicant_id = p.id
      LEFT JOIN people rep ON a.representative_id = rep.id
      LEFT JOIN cases c ON c.application_id = a.id
      WHERE a.client_request_id = ?
    `).get(clientRequestId);

    if (row && row.details_json) {
      try {
        row.details = JSON.parse(row.details_json);
      } catch (e) {
        row.details = {};
      }
    }
    return row;
  }

  create(app) {
    const db = getDb();
    const detailsJson = typeof app.details_json === 'object'
      ? JSON.stringify(app.details_json)
      : app.details_json || null;

    const stmt = db.prepare(`
      INSERT INTO applications (
        id, client_request_id, applicant_id, representative_id, category, intake_channel,
        intake_office, status, summary, summary_bn, details_json,
        version, sync_status, created_by_role, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      app.id,
      app.client_request_id || null,
      app.applicant_id,
      app.representative_id || null,
      app.category,
      app.intake_channel,
      app.intake_office,
      app.status || 'SUBMITTED',
      app.summary,
      app.summary_bn || null,
      detailsJson,
      app.version || 1,
      app.sync_status || 'SYNCED',
      app.created_by_role,
      app.created_by_user_id || null
    );

    return this.findById(app.id);
  }

  update(id, fields = {}) {
    const db = getDb();
    const allowed = ['summary', 'summary_bn', 'category', 'status', 'intake_office', 'sync_status'];
    const sets = [];
    const params = [];

    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        sets.push(`${key} = ?`);
        params.push(val);
      }
    }

    if (fields.details_json || fields.details) {
      sets.push('details_json = ?');
      params.push(JSON.stringify(fields.details_json || fields.details));
    }

    // Always increment version on update
    sets.push('version = version + 1');
    sets.push("updated_at = datetime('now')");

    params.push(id);
    const sql = `UPDATE applications SET ${sets.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);

    return this.findById(id);
  }

  updateStatus(id, newStatus) {
    const db = getDb();
    db.prepare(`
      UPDATE applications
      SET status = ?, version = version + 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, id);

    return this.findById(id);
  }

  list(filters = {}) {
    const db = getDb();
    let query = `
      SELECT 
        a.*,
        p.full_name AS applicant_name,
        p.full_name_bn AS applicant_name_bn,
        p.phone AS applicant_phone,
        rep.full_name AS representative_name,
        c.id AS linked_case_id,
        c.case_number AS linked_case_number,
        c.status AS linked_case_status
      FROM applications a
      JOIN people p ON a.applicant_id = p.id
      LEFT JOIN people rep ON a.representative_id = rep.id
      LEFT JOIN cases c ON c.application_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND a.status = ?';
      params.push(filters.status);
    }
    if (filters.intake_office) {
      query += ' AND a.intake_office = ?';
      params.push(filters.intake_office);
    }

    query += ' ORDER BY a.created_at DESC';
    const rows = db.prepare(query).all(...params);

    return rows.map(r => {
      if (r.details_json) {
        try { r.details = JSON.parse(r.details_json); } catch (e) { r.details = {}; }
      }
      return r;
    });
  }
}

module.exports = new ApplicationRepository();
