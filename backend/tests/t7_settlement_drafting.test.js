const path = require('path');
const fs = require('fs');

// Set test environment database
const testDbPath = path.resolve(__dirname, '../data/test-settlement.sqlite');
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

describe('T7 Settlement Drafting Assistant & Human Confirmation Guardrails', () => {
  let caseId = 'CAS-SETTLE-TEST-01';
  let settlementId = null;

  before(() => {
    const db = getDb(testDbPath);
    seed(db);

    const insertPerson = db.prepare(`
      INSERT INTO people (id, national_id, full_name, phone, district, division)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPerson.run('PER-SETTLE-01', 'NID-SETTLE-001', 'Moyuri Akter', '01700112233', 'Dhaka', 'Dhaka');
    insertPerson.run('PER-SETTLE-02', 'NID-SETTLE-002', 'Faruk Ahmed', '01800112233', 'Dhaka', 'Dhaka');

    const insertApp = db.prepare(`
      INSERT INTO applications (id, applicant_id, category, intake_channel, intake_office, status, summary, created_by_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertApp.run('APP-SETTLE-01', 'PER-SETTLE-01', 'FAMILY_DISPUTE', 'DIRECT_WALKIN', 'DLAO Dhaka', 'APPROVED', 'Spousal maintenance and custody ADR', ROLES.B1_DLAO_OFFICER);

    const insertCase = db.prepare(`
      INSERT INTO cases (id, application_id, case_number, title, category, status, priority, intake_office)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCase.run(caseId, 'APP-SETTLE-01', 'DLAO-DHK-2026-ADR-01', 'Moyuri vs Faruk Family Settlement', 'FAMILY_DISPUTE', 'MEDIATION', 'MEDIUM', 'DLAO Dhaka');
  });

  it('1. Generates draft settlement grounded in template with AI-generated sections visibly marked', async () => {
    const mediatorNotes = `
Mediator Notes - Session 2:
Party A (Moyuri) requests upfront lump sum 35,000 BDT for child educational relocation.
Party B agrees to pay 35,000 lump sum within 14 days, plus 8,000 monthly maintenance.
Child custody remains with mother with weekend visitation.
Both parties agree to cease ongoing civil litigations.
    `.trim();

    const res = await request(app)
      .post(`/api/cases/${caseId}/draft-settlement`)
      .set('x-user-id', 'OFFICER-MEDIATOR-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .send({
        mediator_notes: mediatorNotes,
        template_type: 'ADR_FAMILY_MAINTENANCE'
      });

    assert.equal(res.status, 201, `Failed to draft settlement: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    const draft = res.body.data;
    assert.ok(draft.id);
    settlementId = draft.id;

    // GUARDRAIL ASSERTION: Saved as status=DRAFT, cannot be marked final without confirmation
    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.can_be_marked_final, false);
    assert.ok(draft.guardrail_notice.includes('STATUS=DRAFT'));

    // Check visible marking of AI inferred fields
    const clauses = draft.terms.clauses;
    assert.ok(clauses.length >= 4);

    const aiClauses = clauses.filter(c => c.is_ai_inferred === true);
    const boilerplateClauses = clauses.filter(c => c.is_ai_inferred === false);

    assert.ok(aiClauses.length >= 2, 'Must have at least 2 AI-inferred clauses');
    assert.ok(boilerplateClauses.length >= 1, 'Must have at least 1 grounded boilerplate statutory clause');

    // Confirm upfront lump sum inferred
    const upfrontClause = clauses.find(c => c.clause_key === 'upfront_settlement');
    assert.equal(upfrontClause.is_ai_inferred, true);
    assert.ok(upfrontClause.text.includes('35,000'));
    assert.ok(upfrontClause.grounded_source.includes('Mediator note extract'));
  });

  it('2. Detects internal inconsistencies (e.g. amount mismatch between sections) and flags them', async () => {
    // Inconsistent mediator notes: lump sum stated as 35,000 BDT in Section 1, but 50,000 BDT in Section 3
    const inconsistentNotes = `
Session Notes:
Section 1: Party B agrees to pay upfront 35,000 lump sum for urgent relief.
Section 2: Maintenance will be 7,000 monthly.
Section 3: Respondent notes upfront advance agreed is 50,000 BDT total.
    `.trim();

    const res = await request(app)
      .post(`/api/cases/${caseId}/draft-settlement`)
      .set('x-user-id', 'OFFICER-MEDIATOR-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .send({
        mediator_notes: inconsistentNotes,
        template_type: 'ADR_FAMILY_MAINTENANCE'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const draft = res.body.data;
    assert.ok(draft.inconsistencies.length > 0, 'Must flag at least one inconsistency');

    const amountMismatch = draft.inconsistencies.find(inc => inc.type === 'AMOUNT_MISMATCH');
    assert.ok(amountMismatch, 'Should specifically flag AMOUNT_MISMATCH');
    assert.equal(amountMismatch.severity, 'HIGH');
    assert.ok(amountMismatch.message.includes('conflicting lump sum amounts'));
  });

  it('3. Human officer confirmation action validates and marks draft CONFIRMED_FINAL with audit trail', async () => {
    assert.ok(settlementId, 'Settlement ID from test 1 must exist');

    const res = await request(app)
      .post(`/api/cases/${caseId}/settlements/${settlementId}/confirm`)
      .set('x-user-id', 'SENIOR-OFFICER-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .send({
        resolution_notes: 'Reviewed all terms against ADR mediation log. Discrepancies reconciled. Terms approved as final.'
      });

    assert.equal(res.status, 200, `Failed to confirm settlement: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'CONFIRMED_FINAL');
    assert.equal(res.body.data.confirmed_by_id, 'SENIOR-OFFICER-01');
    assert.ok(res.body.data.confirmed_at);

    // Verify audit log
    const db = getDb(testDbPath);
    const auditRow = db.prepare(`
      SELECT * FROM audit_log WHERE case_id = ? AND action = 'SETTLEMENT_CONFIRMED'
    `).get(caseId);

    assert.ok(auditRow, 'SETTLEMENT_CONFIRMED audit event must be logged');
    assert.equal(auditRow.actor_id, 'SENIOR-OFFICER-01');
    const payload = JSON.parse(auditRow.payload_after);
    assert.equal(payload.status, 'CONFIRMED_FINAL');
  });

  it('4. Rejects unauthorized role attempting to confirm a settlement draft', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseId}/settlements/${settlementId}/confirm`)
      .set('x-user-id', 'CITIZEN-01')
      .set('x-user-role', ROLES.CITIZEN_APPLICANT)
      .send({
        notes: 'Trying to self-confirm without officer review'
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });
});
