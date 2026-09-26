const { getDb } = require('../db/connection');

class IncidentRepository {
  create(incident) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO incident_links (
        id, case_id, incident_type, incident_date, location,
        description, description_bn, severity, is_sensitive_evidence,
        evidence_privacy_level, redacted_summary, police_station_jurisdiction,
        gd_or_fir_number, linked_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      incident.id,
      incident.case_id,
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
}

module.exports = new IncidentRepository();
