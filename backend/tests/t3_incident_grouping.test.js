const path = require('path');
const fs = require('fs');

// Set test environment database
const testDbPath = path.resolve(__dirname, '../data/test-incident.sqlite');
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
const caseRepository = require('../src/repositories/caseRepository');
const { ROLES } = require('../src/utils/constants');

describe('T3 Multiple Applicants, One Incident System', () => {
  let caseId1 = null;
  let caseId2 = null;
  let caseId3 = null;
  const incidentLabel = 'Factory Fire - Savar';
  const sharedEvidenceRef = 'EV-SHARED-SAVAR-FIRE-01';

  before(() => {
    const db = getDb(testDbPath);
    seed(db);

    // Create 3 distinct people for 3 different victims/applicants of the same factory fire
    const insertPerson = db.prepare(`
      INSERT INTO people (id, national_id, full_name, phone, district, division)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPerson.run('PER-WORKER-01', 'NID-SAVAR-001', 'Anowar Hossain', '01711001101', 'Dhaka', 'Dhaka');
    insertPerson.run('PER-WORKER-02', 'NID-SAVAR-002', 'Rashida Begum', '01711001102', 'Dhaka', 'Dhaka');
    insertPerson.run('PER-WORKER-03', 'NID-SAVAR-003', 'Kazi Jahangir', '01711001103', 'Dhaka', 'Dhaka');

    // Create 3 distinct applications
    const insertApp = db.prepare(`
      INSERT INTO applications (id, applicant_id, category, intake_channel, intake_office, status, summary, created_by_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertApp.run('APP-FIRE-01', 'PER-WORKER-01', 'LABOUR_DISPUTE', 'UDC_ASSISTED', 'DLAO Dhaka', 'APPROVED', 'Severe burn injury and medical compensation claim', ROLES.B4_UDC_ENTREPRENEUR);
    insertApp.run('APP-FIRE-02', 'PER-WORKER-02', 'LABOUR_DISPUTE', 'DIRECT_WALKIN', 'DLAO Dhaka', 'APPROVED', 'Unpaid back wages and emergency displacement aid', ROLES.B1_DLAO_OFFICER);
    insertApp.run('APP-FIRE-03', 'PER-WORKER-03', 'LABOUR_DISPUTE', 'HELPLINE_16699', 'DLAO Dhaka', 'APPROVED', 'Wrongful termination following safety hazard complaint', ROLES.B3_HELPLINE_AGENT);

    // Create 3 distinct cases with distinct case-specific instructions and outcomes
    const insertCase = db.prepare(`
      INSERT INTO cases (id, application_id, case_number, title, category, status, priority, intake_office, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    caseId1 = 'CAS-FIRE-01';
    caseId2 = 'CAS-FIRE-02';
    caseId3 = 'CAS-FIRE-03';

    insertCase.run(
      caseId1, 'APP-FIRE-01', 'DLAO-DHK-2026-FIRE-01', 'Anowar Hossain - Medical Compensation',
      'LABOUR_DISPUTE', 'IN_PROGRESS', 'URGENT', 'DLAO Dhaka',
      JSON.stringify({ outcome: 'Medical Board assessment approved 350,000 BDT', instructions: 'Pursue Labour Court compensation claim' })
    );

    insertCase.run(
      caseId2, 'APP-FIRE-02', 'DLAO-DHK-2026-FIRE-02', 'Rashida Begum - Unpaid Back Wages',
      'LABOUR_DISPUTE', 'MEDIATION', 'HIGH', 'DLAO Dhaka',
      JSON.stringify({ outcome: 'Mediation agreement draft pending employer signature', instructions: 'Settle via DLAO mediation board' })
    );

    insertCase.run(
      caseId3, 'APP-FIRE-03', 'DLAO-DHK-2026-FIRE-03', 'Kazi Jahangir - Unlawful Discharge Claim',
      'LABOUR_DISPUTE', 'UNDER_REVIEW', 'MEDIUM', 'DLAO Dhaka',
      JSON.stringify({ outcome: 'Evidence inspection underway', instructions: 'Prepare formal notice to factory management' })
    );
  });

  it('1. POST /api/incidents creates a labeled incident record with shared evidence reference', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({
        incident_label: incidentLabel,
        title: 'Savar Garment Factory Fire Disaster',
        incident_type: 'INDUSTRIAL_DISASTER',
        incident_date: '2026-08-15',
        location: 'Hemayetpur, Savar, Dhaka',
        description: 'Major boiler explosion and electrical fire affecting 40+ workers.',
        shared_evidence_ref: sharedEvidenceRef
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.incident_label, incidentLabel);
    assert.equal(res.body.data.shared_evidence_ref, sharedEvidenceRef);
  });

  it('2. POST /api/cases/:id/link-incident links 3 separate cases to the common incident', async () => {
    // Link Case 1
    const res1 = await request(app)
      .post(`/api/cases/${caseId1}/link-incident`)
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({ incident_label: incidentLabel });
    assert.equal(res1.status, 201);

    // Link Case 2
    const res2 = await request(app)
      .post(`/api/cases/${caseId2}/link-incident`)
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({ incident_label: incidentLabel });
    assert.equal(res2.status, 201);

    // Link Case 3
    const res3 = await request(app)
      .post(`/api/cases/${caseId3}/link-incident`)
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({ incident_label: incidentLabel });
    assert.equal(res3.status, 201);
  });

  it('3. GET /api/incidents/:label/cases returns all 3 linked cases and common shared evidence reference', async () => {
    const encodedLabel = encodeURIComponent(incidentLabel);
    const res = await request(app)
      .get(`/api/incidents/${encodedLabel}/cases`)
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .set('x-user-id', 'PER-OFFICER-B1');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.linked_cases_count, 3);
    assert.equal(res.body.data.shared_evidence_reference, sharedEvidenceRef);
    assert.equal(res.body.data.cases.length, 3);

    const caseNumbers = res.body.data.cases.map(c => c.case_number);
    assert.ok(caseNumbers.includes('DLAO-DHK-2026-FIRE-01'));
    assert.ok(caseNumbers.includes('DLAO-DHK-2026-FIRE-02'));
    assert.ok(caseNumbers.includes('DLAO-DHK-2026-FIRE-03'));
  });

  it('4. GUARDRAIL: Proves 3 linked cases remain 3 distinct records with separate outcomes without data merging', async () => {
    const encodedLabel = encodeURIComponent(incidentLabel);
    const res = await request(app)
      .get(`/api/incidents/${encodedLabel}/cases`)
      .set('x-user-role', ROLES.B1_DLAO_OFFICER);

    const cases = res.body.data.cases;
    assert.equal(cases.length, 3);

    const c1 = cases.find(c => c.id === caseId1);
    const c2 = cases.find(c => c.id === caseId2);
    const c3 = cases.find(c => c.id === caseId3);

    // Assert each case preserves its own distinct applicant
    assert.equal(c1.applicant_name, 'Anowar Hossain');
    assert.equal(c2.applicant_name, 'Rashida Begum');
    assert.equal(c3.applicant_name, 'Kazi Jahangir');

    // Assert each case preserves its own distinct legal status
    assert.equal(c1.status, 'IN_PROGRESS');
    assert.equal(c2.status, 'MEDIATION');
    assert.equal(c3.status, 'UNDER_REVIEW');

    // Assert each case preserves its own distinct outcome & instructions
    assert.ok(c1.case_specific_outcome.includes('350,000 BDT'));
    assert.ok(c2.case_specific_outcome.includes('Mediation agreement'));
    assert.ok(c3.case_specific_outcome.includes('Evidence inspection'));

    assert.ok(c1.case_specific_instructions.includes('Labour Court'));
    assert.ok(c2.case_specific_instructions.includes('mediation board'));
    assert.ok(c3.case_specific_instructions.includes('factory management'));

    // Assert modifying Case 1 status does NOT affect Case 2 or Case 3
    const db = getDb();
    db.prepare("UPDATE cases SET status = 'RESOLVED' WHERE id = ?").run(caseId1);

    const checkC1 = db.prepare('SELECT status FROM cases WHERE id = ?').get(caseId1);
    const checkC2 = db.prepare('SELECT status FROM cases WHERE id = ?').get(caseId2);
    const checkC3 = db.prepare('SELECT status FROM cases WHERE id = ?').get(caseId3);

    assert.equal(checkC1.status, 'RESOLVED');
    assert.equal(checkC2.status, 'MEDIATION'); // Unchanged
    assert.equal(checkC3.status, 'UNDER_REVIEW'); // Unchanged
  });

  it('5. Audit Log: Links generate immutable audit trail entries', () => {
    const db = getDb();
    const audits = db.prepare("SELECT * FROM audit_log WHERE action = 'INCIDENT_LINKED' AND case_id = ?").all(caseId1);
    assert.ok(audits.length >= 1, 'Audit log must record incident linkage');
  });
});
