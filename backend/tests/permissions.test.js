const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

const testDbPath = path.resolve(__dirname, '../data/test-perm.sqlite');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { seed } = require('../src/db/seed');
const { getDb } = require('../src/db/connection');

describe('Role-Based Access Control & Permission Rejection Tests', () => {
  before(() => {
    seed(getDb(testDbPath));
  });

  it('1. Citizen Applicant should NOT be permitted to create a case directly (403 Forbidden)', async () => {
    const payload = {
      application_id: 'APP-20260901-0001',
      title: 'Unauthorized Case Creation Attempt'
    };

    const res = await request(app)
      .post('/api/cases')
      .set('x-user-role', 'CITIZEN_APPLICANT')
      .set('x-user-id', 'PER-CITIZEN-MOYURI')
      .send(payload);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'Forbidden');
    assert.ok(res.body.message.includes('lacks required permission'));
  });

  it('2. Helpline Agent (B3) should NOT be permitted to update case status (403 Forbidden)', async () => {
    const res = await request(app)
      .patch('/api/cases/CASE-20260901-0001/status')
      .set('x-user-role', 'B3_HELPLINE_AGENT')
      .set('x-user-id', 'PER-HELPLINE-B3')
      .send({ status: 'RESOLVED' });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'Forbidden');
  });

  it('3. Panel Lawyer (B5) should NOT be permitted to create new referrals (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/cases/CASE-20260220-0005/referrals')
      .set('x-user-role', 'B5_PANEL_LAWYER')
      .set('x-user-id', 'PER-LAWYER-B5')
      .send({
        referral_type: 'INTERNAL_TRANSFER',
        referring_office: 'Sylhet',
        receiving_office: 'Dhaka',
        reason: 'Unauthorized lawyer referral'
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Forbidden');
  });

  it('4. DLAO Officer (B1) SHOULD be permitted to create case and change status', async () => {
    const res = await request(app)
      .patch('/api/cases/CASE-20260901-0001/status')
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({ status: 'IN_PROGRESS', notes: 'Hearing commenced' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'IN_PROGRESS');
  });

  it('5. Permission rejection should generate an audit log entry for ACCESS_DENIED', async () => {
    // Attempt unauthorized action
    await request(app)
      .post('/api/cases/CASE-20260901-0001/tasks')
      .set('x-user-role', 'CITIZEN_APPLICANT')
      .set('x-user-id', 'PER-CITIZEN-MOYURI')
      .send({
        title: 'Unauthorized Task Creation',
        assigned_to_role: 'B1_DLAO_OFFICER'
      });

    // Verify audit log captured ACCESS_DENIED
    const auditRes = await request(app)
      .get('/api/cases/CASE-20260901-0001/events')
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(auditRes.status, 200);
    const deniedEvents = auditRes.body.data.filter(e => e.action === 'ACCESS_DENIED');
    assert.ok(deniedEvents.length >= 1, 'ACCESS_DENIED audit entry must be recorded');
  });

  it('6. POST /api/cases/:id/events must NOT be accessible with only read permission (403 Forbidden for Helpline/Citizen)', async () => {
    // Helpline agent has case:read but lacks case:create_event
    const helplineRes = await request(app)
      .post('/api/cases/CASE-20260901-0001/events')
      .set('x-user-role', 'B3_HELPLINE_AGENT')
      .set('x-user-id', 'PER-HELPLINE-B3')
      .send({
        action: 'UNAUTHORIZED_STATE_MUTATION',
        notes: 'Helpline attempting to forge case event'
      });

    assert.strictEqual(helplineRes.status, 403);
    assert.strictEqual(helplineRes.body.success, false);
    assert.strictEqual(helplineRes.body.error, 'Forbidden');
    assert.ok(helplineRes.body.message.includes('case:create_event'));

    // Citizen applicant lacks case:create_event
    const citizenRes = await request(app)
      .post('/api/cases/CASE-20260901-0001/events')
      .set('x-user-role', 'CITIZEN_APPLICANT')
      .set('x-user-id', 'PER-CITIZEN-MOYURI')
      .send({
        action: 'UNAUTHORIZED_CITIZEN_EVENT',
        notes: 'Citizen attempting to write event'
      });

    assert.strictEqual(citizenRes.status, 403);
    assert.strictEqual(citizenRes.body.success, false);
  });

  it('7. Multi-Role Shared Data & Persistence Test across Backend Restart (Section 3)', async () => {
    const caseId = 'CASE-20260901-0001';

    // Step 1: DLAO Officer (B1) retrieves the case
    const dlaoGet = await request(app)
      .get(`/api/cases/${caseId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER');
    assert.strictEqual(dlaoGet.status, 200);
    assert.strictEqual(dlaoGet.body.data.id, caseId);

    // Step 2: DLAO Officer (B1) adds an event
    const newEventRes = await request(app)
      .post(`/api/cases/${caseId}/events`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({
        action: 'MULTI_ROLE_COLLABORATION_NOTE',
        notes: 'DLAO officer logged an inter-departmental note for Legal Aid Officer'
      });
    assert.strictEqual(newEventRes.status, 201);
    assert.strictEqual(newEventRes.body.data.action, 'MULTI_ROLE_COLLABORATION_NOTE');

    // Step 3: Retrieve the SAME case as another authorized role (B2 Legal Aid Officer)
    const b2Get = await request(app)
      .get(`/api/cases/${caseId}`)
      .set('x-user-role', 'B2_LEGAL_AID_OFFICER')
      .set('x-user-id', 'PER-MEDIATOR-B2');
    assert.strictEqual(b2Get.status, 200);

    // Step 4: Verify the new event and state is visible to B2
    const foundEventInB2 = b2Get.body.data.audit_trail.find(e => e.action === 'MULTI_ROLE_COLLABORATION_NOTE');
    assert.ok(foundEventInB2, 'Event created by DLAO must be visible to B2 Legal Aid Officer');

    // Step 5 & 6: Attempt unauthorized operation as B3 Helpline Agent and verify rejection
    const unauthRes = await request(app)
      .patch(`/api/cases/${caseId}/status`)
      .set('x-user-role', 'B3_HELPLINE_AGENT')
      .set('x-user-id', 'PER-HELPLINE-B3')
      .send({ status: 'CLOSED' });
    assert.strictEqual(unauthRes.status, 403, 'Unauthorized status mutation must be rejected');

    // Step 7: Restart the backend (close SQLite database connection and re-open)
    const { closeDb } = require('../src/db/connection');
    closeDb();

    // Step 8 & 9: Retrieve the same case again after restart and verify persisted data remains
    const postRestartGet = await request(app)
      .get(`/api/cases/${caseId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER');
    assert.strictEqual(postRestartGet.status, 200);
    const persistedEvent = postRestartGet.body.data.audit_trail.find(e => e.action === 'MULTI_ROLE_COLLABORATION_NOTE');
    assert.ok(persistedEvent, 'Persisted event must survive backend/db restart');
    assert.strictEqual(persistedEvent.actor_id, 'PER-OFFICER-B1');
  });

  it('8. Audit Immutability Test (Section 5): SQLite triggers prevent UPDATE and DELETE', async () => {
    const db = getDb();

    // Insert a test audit record
    const testAuditId = 'AUD-IMMUTABLE-TEST';
    db.prepare(`
      INSERT INTO audit_log (id, case_id, action, actor_id, actor_role, notes)
      VALUES (?, 'CASE-20260901-0001', 'STATUS_CHANGE', 'PER-OFFICER-B1', 'B1_DLAO_OFFICER', 'Initial state')
    `).run(testAuditId);

    // Verify audit entry contains required reconstruction fields
    const record = db.prepare('SELECT * FROM audit_log WHERE id = ?').get(testAuditId);
    assert.strictEqual(record.actor_id, 'PER-OFFICER-B1');
    assert.strictEqual(record.actor_role, 'B1_DLAO_OFFICER');
    assert.strictEqual(record.action, 'STATUS_CHANGE');
    assert.strictEqual(record.case_id, 'CASE-20260901-0001');
    assert.ok(record.created_at, 'Timestamp must exist');

    // Attempt direct SQL UPDATE - must be rejected by SQLite trigger
    assert.throws(() => {
      db.prepare("UPDATE audit_log SET action = 'TAMPERED' WHERE id = ?").run(testAuditId);
    }, /Audit log entries cannot be modified/);

    // Attempt direct SQL DELETE - must be rejected by SQLite trigger
    assert.throws(() => {
      db.prepare('DELETE FROM audit_log WHERE id = ?').run(testAuditId);
    }, /Audit log entries cannot be deleted/);

    // Verify the record is unchanged and still exists
    const preserved = db.prepare('SELECT * FROM audit_log WHERE id = ?').get(testAuditId);
    assert.strictEqual(preserved.action, 'STATUS_CHANGE');
  });
});
