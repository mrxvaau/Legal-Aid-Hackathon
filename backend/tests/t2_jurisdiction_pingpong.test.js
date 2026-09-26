const path = require('path');
const fs = require('fs');

// Set test environment database
const testDbPath = path.resolve(__dirname, '../data/test-jurisdiction.sqlite');
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
const referralService = require('../src/services/referralService');
const caseRepository = require('../src/repositories/caseRepository');
const { ROLES, CASE_STATES } = require('../src/utils/constants');

describe('T2 Jurisdiction Ping-Pong & Escalation System', () => {
  const caseId = 'CAS-PINGPONG-01';
  const appId = 'APP-PINGPONG-01';

  before(() => {
    const db = getDb(testDbPath);
    seed(db);

    // Create a person, application, and case
    db.prepare(`
      INSERT INTO people (id, national_id, full_name, phone, district, division)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('PER-PING-01', 'NID-PING-01', 'Abul Kashem', '01711998877', 'Dhaka', 'Dhaka');

    db.prepare(`
      INSERT INTO applications (id, applicant_id, category, intake_channel, intake_office, status, summary, created_by_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(appId, 'PER-PING-01', 'LAND_DISPUTE', 'DIRECT_WALKIN', 'DLAO Dhaka', 'APPROVED', 'Boundary wall dispute across district borders', ROLES.B1_DLAO_OFFICER);

    db.prepare(`
      INSERT INTO cases (id, application_id, case_number, title, category, status, priority, intake_office)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(caseId, appId, 'DLAO-DHK-2026-PING-01', 'Abul Kashem Boundary Dispute', 'LAND_DISPUTE', 'UNDER_REVIEW', 'HIGH', 'DLAO Dhaka');
  });

  it('1. First transfer: creates referral with transfer_count = 1 and sets status to REFERRED', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseId}/referrals`)
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({
        referral_type: 'DLAO_TO_DLAO',
        target_authority_type: 'DLAO',
        referring_office: 'DLAO Dhaka',
        receiving_office: 'DLAO Gazipur',
        reason: 'Respondent resides across Gazipur district line'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.transfer_count, 1);

    const c = caseRepository.findById(caseId);
    assert.equal(c.status, CASE_STATES.REFERRED, 'Case status should be REFERRED on 1st transfer');
    assert.notEqual(c.status, CASE_STATES.ESCALATION_REQUIRED, 'Must NOT escalate on 1st transfer');
  });

  it('2. Second transfer: detects ping-pong, auto-sets status to ESCALATION_REQUIRED and creates senior officer task', async () => {
    // Gazipur transfers back to Dhaka (Ping-Pong 2nd transfer)
    const res = await request(app)
      .post(`/api/cases/${caseId}/referrals`)
      .set('x-user-role', ROLES.B6_RECEIVING_DLAO)
      .set('x-user-id', 'PER-RECEIVING-B6')
      .send({
        referral_type: 'DLAO_TO_DLAO',
        target_authority_type: 'DLAO',
        referring_office: 'DLAO Gazipur',
        receiving_office: 'DLAO Dhaka',
        reason: 'Disputed land parcel is registered under Savar, Dhaka jurisdiction'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.transfer_count, 2);

    const c = caseRepository.findById(caseId);
    assert.equal(c.status, CASE_STATES.ESCALATION_REQUIRED, 'Case status must be ESCALATION_REQUIRED after 2nd transfer');

    // Verify task created for senior officer
    const db = getDb();
    const task = db.prepare("SELECT * FROM tasks WHERE case_id = ? AND title LIKE '%Jurisdiction Ping-Pong%'").get(caseId);
    assert.ok(task, 'Task for senior officer review must be generated');
    assert.equal(task.assigned_to_role, ROLES.B1_DLAO_OFFICER);
    assert.equal(task.priority, 'URGENT');

    // Verify audit log entry
    const audit = db.prepare("SELECT * FROM audit_log WHERE case_id = ? AND action = 'JURISDICTION_PING_PONG_ESCALATED'").get(caseId);
    assert.ok(audit, 'Audit log must record ping-pong escalation');
  });

  it('3. GUARDRAIL: System only escalates and recommends; it never auto-decides the jurisdiction', () => {
    const c = caseRepository.findById(caseId);
    // Case status remains ESCALATION_REQUIRED awaiting human officer decision
    assert.equal(c.status, CASE_STATES.ESCALATION_REQUIRED, 'System must leave case in ESCALATION_REQUIRED');
    // System must not have arbitrarily picked a winner or closed the case
    assert.notEqual(c.status, 'RESOLVED');
    assert.notEqual(c.status, 'CLOSED');
  });

  it('4. PATCH /api/cases/:id/jurisdiction-decision records human officer definitive routing and writes audit_log', async () => {
    const res = await request(app)
      .patch(`/api/cases/${caseId}/jurisdiction-decision`)
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({
        definitive_office: 'DLAO Dhaka',
        rationale: 'Title deed records and primary witnesses reside under Savar Upazila, Dhaka District jurisdiction.',
        status: 'IN_PROGRESS'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.intake_office, 'DLAO Dhaka');
    assert.equal(res.body.data.status, 'IN_PROGRESS');

    // Verify audit log
    const db = getDb();
    const audit = db.prepare("SELECT * FROM audit_log WHERE case_id = ? AND action = 'JURISDICTION_DECIDED'").get(caseId);
    assert.ok(audit, 'Audit log must record definitive jurisdiction decision');
    assert.ok(audit.notes.includes('DLAO Dhaka'), 'Audit notes must record definitive office');
  });
});
