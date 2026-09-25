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
      .post('/api/cases/CASE-20210415-0005/referrals')
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
});
