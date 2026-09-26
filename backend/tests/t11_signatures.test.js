const path = require('path');
const fs = require('fs');

// Set test environment database
const testDbPath = path.resolve(__dirname, '../data/test-signatures.sqlite');
if (fs.existsSync(testDbPath)) {
  try { fs.unlinkSync(testDbPath); } catch (e) {}
}
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { getDb } = require('../src/db/connection');
const { seed } = require('../src/db/seed');
const app = require('../src/app');
const { ROLES } = require('../src/utils/constants');

describe('T11 Offline-Capable Secure E-Signature & Document Integrity', () => {
  let caseId = 'CAS-SIG-TEST-01';
  const personAId = 'PER-SIG-PARTY-A';
  const personBId = 'PER-SIG-PARTY-B';

  const originalDocumentText = `
GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH
DISTRICT LEGAL AID OFFICE, DHAKA
ALTERNATIVE DISPUTE RESOLUTION (ADR) SETTLEMENT ACCORD

Case Reference: CAS-SIG-TEST-01
Subject: Mutual Separation & Severance Settlement

1. Party A agrees to accept BDT 75,000 as final severance settlement.
2. Party B agrees to release clearance certificates within 7 working days.
3. Both parties agree all ongoing claims are hereby resolved and extinguished.
Dated: 2026-09-26
  `.trim();

  const alteredDocumentText = `
GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH
DISTRICT LEGAL AID OFFICE, DHAKA
ALTERNATIVE DISPUTE RESOLUTION (ADR) SETTLEMENT ACCORD

Case Reference: CAS-SIG-TEST-01
Subject: Mutual Separation & Severance Settlement

1. Party A agrees to accept BDT 500,000 as final severance settlement.
2. Party B agrees to release clearance certificates within 7 working days.
3. Both parties agree all ongoing claims are hereby resolved and extinguished.
Dated: 2026-09-26
  `.trim();

  before(() => {
    const db = getDb(testDbPath);
    seed(db);

    const insertPerson = db.prepare(`
      INSERT INTO people (id, national_id, full_name, phone, district, division)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPerson.run(personAId, 'NID-SIG-001', 'Tahmina Akter (Worker)', '01711223344', 'Dhaka', 'Dhaka');
    insertPerson.run(personBId, 'NID-SIG-002', 'Kabir Enterprise (Manager)', '01811223344', 'Dhaka', 'Dhaka');

    const insertApp = db.prepare(`
      INSERT INTO applications (id, applicant_id, category, intake_channel, intake_office, status, summary, created_by_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertApp.run('APP-SIG-01', personAId, 'LABOUR_DISPUTE', 'DIRECT_WALKIN', 'DLAO Dhaka', 'APPROVED', 'Severance dispute settlement', ROLES.B1_DLAO_OFFICER);

    const insertCase = db.prepare(`
      INSERT INTO cases (id, application_id, case_number, title, category, status, priority, intake_office)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCase.run(caseId, 'APP-SIG-01', 'DLAO-DHK-2026-SIG-01', 'Tahmina vs Kabir Enterprise Settlement', 'LABOUR_DISPUTE', 'MEDIATION', 'MEDIUM', 'DLAO Dhaka');
  });

  it('1. Party A signs online: computes SHA-256 hash, writes to database with SYNCED status', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseId}/sign`)
      .set('x-user-id', personAId)
      .set('x-user-role', ROLES.CITIZEN_APPLICANT)
      .send({
        signer_person_id: personAId,
        signer_role: 'APPLICANT',
        document_title: 'ADR Settlement Accord',
        document_content: originalDocumentText,
        sync_status: 'SYNCED'
      });

    assert.equal(res.status, 201, `Failed to sign: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.signer_person_id, personAId);
    assert.equal(res.body.data.sync_status, 'SYNCED');
    assert.ok(res.body.data.document_hash, 'Should contain document SHA-256 hash');
    assert.equal(res.body.data.document_hash.length, 64, 'SHA-256 hash must be 64 hex characters');

    // Check GUARDRAIL notice
    assert.ok(res.body.data.guardrail_notice.includes('DOCUMENT INTEGRITY ONLY'));
  });

  it('2. Party B signs async/offline: stores with PENDING_SYNC status and matches exact document hash', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseId}/sign`)
      .set('x-user-id', personBId)
      .set('x-user-role', ROLES.CITIZEN_APPLICANT)
      .send({
        signer_person_id: personBId,
        signer_role: 'RESPONDENT',
        document_title: 'ADR Settlement Accord',
        document_content: originalDocumentText,
        sync_status: 'PENDING_SYNC',
        signed_at: new Date(Date.now() - 3600000).toISOString() // Signed 1 hour ago while offline
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.signer_person_id, personBId);
    assert.equal(res.body.data.sync_status, 'PENDING_SYNC');
    assert.equal(res.body.data.document_hash.length, 64);
  });

  it('3. Verifies document integrity when document is intact and untampered', async () => {
    const res = await request(app)
      .get(`/api/cases/${caseId}/verify-signatures`)
      .set('x-user-id', 'OFFICER-DHAKA-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .query({ document_content: originalDocumentText });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.total_signatures, 2);
    assert.equal(res.body.data.is_tampered, false);
    assert.equal(res.body.data.status, 'INTEGRITY_VERIFIED');
    assert.ok(res.body.data.guardrail_notice.includes('DOCUMENT INTEGRITY ONLY'));

    // Check both signatures verified
    for (const sig of res.body.data.signatures) {
      assert.equal(sig.is_hash_matching, true);
    }
  });

  it('4. Detects tampering when document content has been altered', async () => {
    const res = await request(app)
      .get(`/api/cases/${caseId}/verify-signatures`)
      .set('x-user-id', 'OFFICER-DHAKA-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .query({ document_content: alteredDocumentText });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.is_tampered, true);
    assert.equal(res.body.data.status, 'DOCUMENT_ALTERED_TAMPER_DETECTED');
    assert.ok(res.body.data.tampered_reason.includes('Document hash mismatch'));
    for (const sig of res.body.data.signatures) {
      assert.equal(sig.is_hash_matching, false);
    }
  });

  it('5. Audit log correctly tracks DOCUMENT_SIGNED events with document hash', () => {
    const db = getDb(testDbPath);
    const auditRows = db.prepare(`
      SELECT * FROM audit_log WHERE case_id = ? AND action = 'DOCUMENT_SIGNED'
    `).all(caseId);

    assert.ok(auditRows.length >= 2, 'Should have at least 2 audit events for 2 signatures');
    for (const row of auditRows) {
      assert.equal(row.action, 'DOCUMENT_SIGNED');
      const payload = JSON.parse(row.payload_after);
      assert.ok(payload.document_hash, 'Audit payload must retain document hash');
      assert.ok(row.notes.includes('Proves document integrity only'));
    }
  });
});
