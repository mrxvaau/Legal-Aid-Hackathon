const path = require('path');
const fs = require('fs');

// Set test environment database
const testDbPath = path.resolve(__dirname, '../data/test-summarization.sqlite');
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

describe('T6 Document Summarization & Checklist Agent with Citation & Zero-Hallucination Guardrails', () => {
  let caseId = 'CAS-SUMM-TEST-01';
  let briefingId = null;

  const sampleDocuments = [
    {
      id: 'DOC-NID-001',
      title: 'National Identity Card (NID) Copy',
      text: 'People\'s Republic of Bangladesh National ID: 19942691234567890. Name: Moyuri Akter. Date of Birth: 12 May 1994. Savar, Dhaka.'
    },
    {
      id: 'DOC-NIKAH-002',
      title: 'Nikahnama Marriage Registration',
      text: 'Marriage Deed registered at Savar Kazi Office. Dower amount fixed at 300,000 BDT. Paid 50,000 BDT at marriage; remaining 250,000 BDT deferred dower.'
    },
    {
      id: 'DOC-MED-003',
      title: 'Upazila Health Complex Medical Injury Report',
      text: 'Patient Moyuri Akter presented with blunt trauma contusions on upper forearm. [PAGE 2 TORN AND WATER-DAMAGED: unreadable illegible text regarding exact radiological remarks] Patient treated with anti-inflammatory medication.'
    },
    {
      id: 'DOC-CHAIR-004',
      title: 'Union Parishad Chairman Indigency Certificate',
      text: 'This is to certify that Moyuri Akter is an indigent permanent resident of Ward 3, Savar, with no independent landed assets and qualifies for state legal aid.'
    },
    {
      id: 'DOC-GD-005',
      title: 'Savar Model Thana Police General Diary (GD)',
      text: 'GD Entry No. 892 dated 14-02-2026. Complainant reports verbal intimidation, domestic assault threats, and seizure of mobile communications.'
    }
  ];

  before(() => {
    const db = getDb(testDbPath);
    seed(db);

    const insertPerson = db.prepare(`
      INSERT INTO people (id, national_id, full_name, phone, district, division)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPerson.run('PER-SUMM-01', '19942691234567890', 'Moyuri Akter', '01711998877', 'Dhaka', 'Dhaka');

    const insertApp = db.prepare(`
      INSERT INTO applications (id, applicant_id, category, intake_channel, intake_office, status, summary, created_by_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertApp.run('APP-SUMM-01', 'PER-SUMM-01', 'FAMILY_DISPUTE', 'DIRECT_WALKIN', 'DLAO Dhaka', 'APPROVED', 'Intake with multiple physical and medical records', ROLES.B1_DLAO_OFFICER);

    const insertCase = db.prepare(`
      INSERT INTO cases (id, application_id, case_number, title, category, status, priority, intake_office)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCase.run(caseId, 'APP-SUMM-01', 'DLAO-DHK-2026-DOC-01', 'Moyuri Akter Domestic Protection & Maintenance', 'FAMILY_DISPUTE', 'IN_PROGRESS', 'HIGH', 'DLAO Dhaka');
  });

  it('1. Summarizes 5 documents, proving EVERY statement cites its source document', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseId}/documents/summarize`)
      .set('x-user-id', 'OFFICER-LEGAL-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .send({ documents: sampleDocuments });

    assert.equal(res.status, 201, `Failed to summarize documents: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    const briefing = res.body.data;
    briefingId = briefing.id;
    assert.ok(briefingId);

    // GUARDRAIL ASSERTION: Every statement must cite its exact source document
    const statements = briefing.summary;
    assert.ok(statements.length >= 5, 'Must generate statements for documents');

    for (const stmt of statements) {
      assert.ok(stmt.source_document_id, 'Statement must cite source_document_id');
      assert.ok(stmt.source_document_title, 'Statement must cite source_document_title');
      assert.ok(typeof stmt.is_unclear === 'boolean', 'Statement must specify is_unclear flag');
      assert.ok(stmt.statement.length > 5, 'Statement must have substantive content');
    }

    // Verify citation mapping for NID and Nikahnama specifically
    const nidStmt = statements.find(s => s.source_document_id === 'DOC-NID-001');
    assert.ok(nidStmt);
    assert.ok(nidStmt.statement.includes('19942691234567890'));

    const nikahStmt = statements.find(s => s.source_document_id === 'DOC-NIKAH-002');
    assert.ok(nikahStmt);
    assert.ok(nikahStmt.statement.includes('300,000'));
  });

  it('2. GUARDRAIL: Surfaces damaged/unreadable text as "unclear" with zero hallucination', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseId}/documents/summarize`)
      .set('x-user-id', 'OFFICER-LEGAL-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .send({ documents: sampleDocuments });

    assert.equal(res.status, 201);
    const briefing = res.body.data;
    assert.equal(briefing.has_unclear_sections, true);

    const unclearStmt = briefing.summary.find(s => s.is_unclear === true);
    assert.ok(unclearStmt, 'Must surface unreadable section as is_unclear: true');
    assert.equal(unclearStmt.source_document_id, 'DOC-MED-003');
    assert.ok(unclearStmt.statement.includes('UNREADABLE/UNCLEAR SECTION'));
    assert.ok(unclearStmt.confidence_score <= 0.25, 'Unclear statements must have low confidence score');
  });

  it('3. Generates missing-items checklist against case-type requirements', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseId}/documents/summarize`)
      .set('x-user-id', 'OFFICER-LEGAL-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .send({ documents: sampleDocuments });

    assert.equal(res.status, 201);
    const briefing = res.body.data;
    const missing = briefing.missing_items;

    // We provided NID, Nikahnama, Medical, Chairman Indigency, and GD
    // The checklist also expects 'Designation of Safe Alternative Representative'
    assert.ok(Array.isArray(missing));
    assert.ok(missing.includes('Designation of Safe Alternative Representative'), 'Should identify missing safe alternative representative form');
  });

  it('4. Guardrail: Briefing cannot be used without explicit human officer confirmation', async () => {
    assert.ok(briefingId);

    // Initial state is unconfirmed
    const db = getDb(testDbPath);
    const briefingRow = db.prepare('SELECT * FROM document_briefings WHERE id = ?').get(briefingId);
    assert.equal(briefingRow.is_confirmed_by_officer, 0);

    // Officer confirms briefing
    const res = await request(app)
      .post(`/api/cases/${caseId}/documents/confirm-briefing`)
      .set('x-user-id', 'OFFICER-SUPERVISOR-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .send({
        briefingId,
        officer_notes: 'Reviewed document citations and acknowledged medical report tear. Safe representative form requested.'
      });

    assert.equal(res.status, 200, `Failed to confirm briefing: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.is_confirmed_by_officer, 1);
    assert.equal(res.body.data.confirmed_by_id, 'OFFICER-SUPERVISOR-01');

    // Audit log check
    const auditRow = db.prepare(`
      SELECT * FROM audit_log WHERE case_id = ? AND action = 'BRIEFING_CONFIRMED'
    `).get(caseId);
    assert.ok(auditRow, 'BRIEFING_CONFIRMED audit event must be logged');
    assert.equal(auditRow.actor_id, 'OFFICER-SUPERVISOR-01');
  });
});
