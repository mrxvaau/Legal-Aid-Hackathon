const { getDb } = require('../db/connection');

class IncidentRepository {
  create(incident) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO incident_links (
        id, case_id, incident_label, incident_type, incident_date, location,
        description, description_bn, severity, is_sensitive_evidence,
        evidence_privacy_level, redacted_summary, police_station_jurisdiction,
        gd_or_fir_number, linked_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      incident.id,
      incident.case_id,
      incident.incident_label || null,
      incident.incident_type,
      incident.incident_date,
      incident.location,
      incident.description,
      incident.description_bn || null,
      incident.severity || 'MEDIUM',
      incident.is_sensitive_evidence ? 1 : 0,
      incident.evidence_privacy_level || 'STANDARD',
      incident.redacted_summary || null,
      incident.police_station_jurisdiction || null,
      incident.gd_or_fir_number || null,
      incident.linked_by_user_id || null
    );

    return this.findById(incident.id);
  }

  findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM incident_links WHERE id = ?').get(id);
  }

  listByCaseId(caseId) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM incident_links
      WHERE case_id = ?
      ORDER BY incident_date DESC, created_at DESC
    `).all(caseId);
  }

  createLabeledIncident(data) {
    const db = getDb();
    const id = data.id || `INC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const stmt = db.prepare(`
      INSERT INTO incidents (
        id, incident_label, title, incident_type, incident_date,
        location, description, shared_evidence_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.incident_label,
      data.title || data.incident_label,
      data.incident_type || 'MASS_INCIDENT',
      data.incident_date || new Date().toISOString().substring(0, 10),
      data.location || 'Unknown',
      data.description || '',
      data.shared_evidence_ref || null
    );
    return this.findIncidentByLabel(data.incident_label);
  }

  findIncidentByLabel(label) {
    const db = getDb();
    return db.prepare('SELECT * FROM incidents WHERE incident_label = ?').get(label);
  }

  linkCaseToIncident({ id, case_id, incident_label, incident_type, incident_date, location, description, actor_id }) {
    const db = getDb();
    const linkId = id || `INCLINK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const stmt = db.prepare(`
      INSERT INTO incident_links (
        id, case_id, incident_label, incident_type, incident_date, location,
        description, linked_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      linkId,
      case_id,
      incident_label,
      incident_type || 'MASS_INCIDENT',
      incident_date || new Date().toISOString().substring(0, 10),
      location || 'Incident Location',
      description || `Linked to incident: ${incident_label}`,
      actor_id || 'SYSTEM'
    );
    return db.prepare('SELECT * FROM incident_links WHERE id = ?').get(linkId);
  }

  listCasesByIncidentLabel(label) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        c.id,
        c.case_number,
        c.title,
        c.title_bn,
        c.status,
        c.category,
        c.priority,
        c.intake_office,
        c.filing_date,
        c.details_json,
        p.full_name AS applicant_name,
        p.phone AS applicant_phone,
        p.national_id AS applicant_nid,
        il.id AS incident_link_id,
        il.created_at AS linked_at
      FROM incident_links il
      JOIN cases c ON il.case_id = c.id
      JOIN applications a ON c.application_id = a.id
      JOIN people p ON a.applicant_id = p.id
      WHERE il.incident_label = ?
      ORDER BY il.created_at ASC
    `).all(label);

    return rows.map(r => {
      let details = {};
      if (r.details_json) {
        try { details = JSON.parse(r.details_json); } catch (e) {}
      }
      return {
        ...r,
        case_specific_outcome: details.outcome || details.remedy_sought || 'Active Individual Proceeding',
        case_specific_instructions: details.instructions || details.safe_contact_notes || 'Independent Case Handling',
        details
      };
    });
  }
}

module.exports = new IncidentRepository();
