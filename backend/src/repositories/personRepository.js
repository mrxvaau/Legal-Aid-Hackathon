const { getDb } = require('../db/connection');

class PersonRepository {
  findById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM people WHERE id = ?').get(id);
    if (row && row.socio_economic_profile) {
      try {
        row.socio_economic_profile = JSON.parse(row.socio_economic_profile);
      } catch (e) {
        // Keep as raw if parsing fails
      }
    }
    return row;
  }

  findByNid(nationalId) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM people WHERE national_id = ?').get(nationalId);
    if (row && row.socio_economic_profile) {
      try {
        row.socio_economic_profile = JSON.parse(row.socio_economic_profile);
      } catch (e) {}
    }
    return row;
  }

  create(person) {
    const db = getDb();
    const profileJson = typeof person.socio_economic_profile === 'object' 
      ? JSON.stringify(person.socio_economic_profile) 
      : person.socio_economic_profile || null;

    const stmt = db.prepare(`
      INSERT INTO people (
        id, national_id, full_name, full_name_bn, gender, date_of_birth,
        phone, email, address, upazila, district, division, socio_economic_profile
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      person.id,
      person.national_id || null,
      person.full_name,
      person.full_name_bn || null,
      person.gender || 'UNKNOWN',
      person.date_of_birth || null,
      person.phone || null,
      person.email || null,
      person.address || null,
      person.upazila || null,
      person.district,
      person.division,
      profileJson
    );

    return this.findById(person.id);
  }

  list() {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM people ORDER BY created_at DESC').all();
    return rows.map(r => {
      if (r.socio_economic_profile) {
        try { r.socio_economic_profile = JSON.parse(r.socio_economic_profile); } catch (e) {}
      }
      return r;
    });
  }
}

module.exports = new PersonRepository();
