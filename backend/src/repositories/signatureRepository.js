const { getDb } = require('../db/connection');

class SignatureRepository {
  create(sig) {
    const db = getDb();
    const id = sig.id || `SIG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const metadataJson = typeof sig.signature_metadata === 'object' 
      ? JSON.stringify(sig.signature_metadata) 
      : sig.signature_metadata || null;

    const stmt = db.prepare(`
      INSERT INTO signatures (
        id, case_id, signer_person_id, signer_role, document_id,
        document_title, document_hash, signed_at, sync_status, signature_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sig.case_id,
      sig.signer_person_id,
      sig.signer_role || 'PARTY',
      sig.document_id || null,
      sig.document_title || 'Legal Aid Document',
      sig.document_hash,
      sig.signed_at || new Date().toISOString(),
      sig.sync_status || 'SYNCED',
      metadataJson
    );

    return this.findById(id);
  }

  findById(id) {
    const db = getDb();
    return db.prepare(`
      SELECT s.*, p.full_name AS signer_name, p.phone AS signer_phone, p.national_id AS signer_nid
      FROM signatures s
      JOIN people p ON s.signer_person_id = p.id
      WHERE s.id = ?
    `).get(id);
  }

  findByCaseId(caseId) {
    const db = getDb();
    return db.prepare(`
      SELECT s.*, p.full_name AS signer_name, p.phone AS signer_phone, p.national_id AS signer_nid
      FROM signatures s
      JOIN people p ON s.signer_person_id = p.id
      WHERE s.case_id = ?
      ORDER BY s.signed_at ASC
    `).all(caseId);
  }
}

module.exports = new SignatureRepository();
