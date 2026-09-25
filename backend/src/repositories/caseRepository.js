const { getDb } = require('../db/connection');

class CaseRepository {
  findById(id) {
    const db = getDb();
    const row = db.prepare(`
      SELECT 
        c.*,
        a.category AS application_category,
        a.intake_channel,
        a.intake_office AS app_intake_office,
        a.applicant_id,
        a.representative_id,
        a.summary AS application_summary,
        a.summary_bn AS application_summary_bn,
        lawyer.full_name AS assigned_lawyer_name,
        lawyer.full_name_bn AS assigned_lawyer_name_bn,
        officer.full_name AS assigned_officer_name
      FROM cases c
      JOIN applications a ON c.application_id = a.id
      LEFT JOIN people lawyer ON c.assigned_lawyer_id = lawyer.id
      LEFT JOIN people officer ON c.assigned_officer_id = officer.id
      WHERE c.id = ?
    `).get(id);

    if (row && row.details_json) {
      try { row.details = JSON.parse(row.details_json); } catch (e) { row.details = {}; }
    }
    return row;
  }

  create(c) {
    const db = getDb();
    const detailsJson = typeof c.details_json === 'object'
      ? JSON.stringify(c.details_json)
      : c.details_json || null;

    const stmt = db.prepare(`
      INSERT INTO cases (
        id, application_id, case_number, title, title_bn, category,
        status, priority, intake_office, court_name,
        assigned_officer_id, assigned_lawyer_id, details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      c.id,
      c.application_id,
      c.case_number,
      c.title,
      c.title_bn || null,
      c.category,
      c.status || 'NEW',
      c.priority || 'MEDIUM',
      c.intake_office,
      c.court_name || null,
      c.assigned_officer_id || null,
      c.assigned_lawyer_id || null,
      detailsJson
    );

    return this.findById(c.id);
  }

  updateStatus(id, newStatus) {
    const db = getDb();
    db.prepare(`
      UPDATE cases
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, id);

    return this.findById(id);
  }

  assignLawyer(id, lawyerId) {
    const db = getDb();
    db.prepare(`
      UPDATE cases
      SET assigned_lawyer_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(lawyerId, id);

    return this.findById(id);
  }

  addPersonToCase(link) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO case_people (
        id, case_id, person_id, role_in_case, relationship_to_applicant,
        authorization_doc_ref, is_primary_contact, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(case_id, person_id, role_in_case) DO UPDATE SET
        relationship_to_applicant = excluded.relationship_to_applicant,
        authorization_doc_ref = excluded.authorization_doc_ref,
        is_primary_contact = excluded.is_primary_contact,
        notes = excluded.notes
    `);

    stmt.run(
      link.id,
      link.case_id,
      link.person_id,
      link.role_in_case,
      link.relationship_to_applicant || 'SELF',
      link.authorization_doc_ref || null,
      link.is_primary_contact ? 1 : 0,
      link.notes || null
    );

    return this.findCasePerson(link.case_id, link.person_id, link.role_in_case);
  }

  findCasePerson(caseId, personId, roleInCase) {
    const db = getDb();
    return db.prepare(`
      SELECT 
        cp.*,
        p.full_name,
        p.full_name_bn,
        p.phone,
        p.email,
        p.district,
        p.gender,
        p.socio_economic_profile
      FROM case_people cp
      JOIN people p ON cp.person_id = p.id
      WHERE cp.case_id = ? AND cp.person_id = ? AND cp.role_in_case = ?
    `).get(caseId, personId, roleInCase);
  }

  listPeopleForCase(caseId) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        cp.*,
        p.full_name,
        p.full_name_bn,
        p.phone,
        p.email,
        p.district,
        p.gender,
        p.national_id,
        p.socio_economic_profile
      FROM case_people cp
      JOIN people p ON cp.person_id = p.id
      WHERE cp.case_id = ?
      ORDER BY cp.is_primary_contact DESC, cp.created_at ASC
    `).all(caseId);

    return rows.map(r => {
      if (r.socio_economic_profile) {
        try { r.socio_economic_profile = JSON.parse(r.socio_economic_profile); } catch (e) {}
      }
      return r;
    });
  }

  list(filters = {}) {
    const db = getDb();
    let query = `
      SELECT 
        c.*,
        a.category AS app_category,
        a.intake_channel,
        applicant.full_name AS applicant_name,
        applicant.full_name_bn AS applicant_name_bn,
        rep.full_name AS representative_name,
        lawyer.full_name AS assigned_lawyer_name
      FROM cases c
      JOIN applications a ON c.application_id = a.id
      JOIN people applicant ON a.applicant_id = applicant.id
      LEFT JOIN people rep ON a.representative_id = rep.id
      LEFT JOIN people lawyer ON c.assigned_lawyer_id = lawyer.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND c.status = ?';
      params.push(filters.status);
    }
    if (filters.intake_office) {
      query += ' AND c.intake_office = ?';
      params.push(filters.intake_office);
    }
    if (filters.search) {
      query += ' AND (c.case_number LIKE ? OR c.title LIKE ? OR applicant.full_name LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY c.created_at DESC';
    return db.prepare(query).all(...params);
  }
}

module.exports = new CaseRepository();
