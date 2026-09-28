const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { getDb } = require('../src/db/connection');
const { seed } = require('../src/db/seed');

describe('Emergency / Danger Alert System & Safe Contact Guardrails', () => {
  before(() => {
    seed();
  });

  test('1. Citizen triggers emergency alert: creates real DB alert, urgent task, and audit_log entry', async () => {
    const res = await request(app)
      .post('/api/emergency/alert')
      .set('x-user-role', 'CITIZEN_APPLICANT')
      .set('x-user-id', 'PER-CITIZEN-MOYURI')
      .send({
        citizen_id: 'PER-CITIZEN-MOYURI',
        case_id: 'CASE-20260901-0001',
        source_channel: 'CITIZEN_PORTAL',
        danger_notes: 'Urgent danger assistance requested from home.'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.priority, 'URGENT');
    assert.equal(res.body.data.status, 'PENDING');
    assert.ok(res.body.data.alert_id);
    assert.ok(res.body.data.task_id);

    // Verify Task was created in DB with priority URGENT and status PENDING
    const db = getDb();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(res.body.data.task_id);
    assert.ok(task, 'Task must exist in database');
    assert.equal(task.priority, 'URGENT');
    assert.equal(task.status, 'PENDING');
    assert.equal(task.assigned_to_role, 'B1_DLAO_OFFICER');

    // Verify Audit Log entry for trigger
    const audit = db.prepare(`
      SELECT * FROM audit_log 
      WHERE action = 'emergency_alert_triggered' AND case_id = 'CASE-20260901-0001'
      ORDER BY created_at DESC LIMIT 1
    `).get();
    assert.ok(audit, 'Audit log entry for emergency_alert_triggered must exist');
    assert.equal(audit.actor_id, 'PER-CITIZEN-MOYURI');
  });

  test('2. Safe Contact Guardrail: Alert for Moyuri preserves safe contact protocol without leaking/bypassing', async () => {
    const res = await request(app)
      .post('/api/emergency/alert')
      .set('x-user-role', 'CITIZEN_APPLICANT')
      .set('x-user-id', 'PER-CITIZEN-MOYURI')
      .send({
        citizen_id: 'PER-CITIZEN-MOYURI',
        case_id: 'CASE-20260901-0001',
        source_channel: 'CITIZEN_PORTAL'
      });

    assert.equal(res.status, 201);
    // Must recognize safe contact is active
    assert.equal(res.body.data.safe_contact_active, 1);
    assert.equal(res.body.data.preferred_contact_method, 'IN_PERSON_REPRESENTATIVE');
    assert.ok(res.body.data.unsafe_channels.includes('PRIMARY_PHONE'));

    // Check task description contains the explicit instruction NOT to call unsafe phone
    const db = getDb();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(res.body.data.task_id);
    assert.ok(task.description.includes('SAFE CONTACT ACTIVE'));
    assert.ok(task.description.includes('DO NOT CALL UNSAFE CHANNELS'));
  });

  test('3. Officer queue: Emergency alerts appear at the TOP with escalation metrics', async () => {
    const res = await request(app)
      .get('/api/emergency/alerts')
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.length >= 1);
    // Top alert should be PENDING
    assert.equal(res.body.data[0].status, 'PENDING');
    assert.equal(res.body.data[0].priority, 'URGENT');
    assert.ok(res.body.data[0].case_number);
  });

  test('4. Officer Acknowledges Alert: writes audit entry and marks in-progress', async () => {
    // 1. Get current pending alert
    const listRes = await request(app)
      .get('/api/emergency/alerts')
      .set('x-user-role', 'B1_DLAO_OFFICER');

    const pendingAlert = listRes.body.data.find(a => a.status === 'PENDING');
    assert.ok(pendingAlert, 'Must have at least one pending alert');

    // 2. Acknowledge
    const ackRes = await request(app)
      .post(`/api/emergency/alerts/${pendingAlert.id}/acknowledge`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1')
      .set('x-user-name', 'Shamsul Huda');

    assert.equal(ackRes.status, 200);
    assert.equal(ackRes.body.success, true);
    assert.equal(ackRes.body.data.status, 'ACKNOWLEDGED');

    // 3. Verify audit log entry exists
    const db = getDb();
    const ackAudit = db.prepare(`
      SELECT * FROM audit_log 
      WHERE action = 'emergency_alert_acknowledged'
      ORDER BY created_at DESC LIMIT 1
    `).get();

    assert.ok(ackAudit, 'Audit log entry for emergency_alert_acknowledged must exist');
    assert.equal(ackAudit.actor_id, 'PER-OFFICER-B1');

    // 4. Verify task is updated to IN_PROGRESS
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(pendingAlert.task_id);
    assert.equal(task.status, 'IN_PROGRESS');
  });

  test('5. Unlinked Citizen / Guest Alert: gracefully handles without pre-existing case', async () => {
    const res = await request(app)
      .post('/api/emergency/alert')
      .set('x-user-role', 'CITIZEN_APPLICANT')
      .set('x-user-id', 'PER-GUEST-999')
      .send({
        source_channel: 'CITIZEN_INTAKE',
        danger_notes: 'Walk-in guest facing immediate danger without prior case ID.'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.priority, 'URGENT');
    assert.ok(res.body.data.case_id);
    assert.ok(res.body.data.task_id);
  });
});
