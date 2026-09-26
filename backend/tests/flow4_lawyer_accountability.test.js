const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

const testDbPath = path.resolve(__dirname, '../data/test-flow4.sqlite');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { seed } = require('../src/db/seed');
const { getDb } = require('../src/db/connection');

describe('FLOW 4: Abdul Malek — Lawyer Accountability & Non-Smartphone Status Query', () => {
  before(() => {
    seed(getDb(testDbPath));
  });

  const abdulCaseId = 'CASE-20260220-0005';
  const abdulAppId = 'APP-20260220-0005';
  const abdulCaseNumber = 'DLAO-SYL-2026-0048';
  const abdulInquiryCode = '16699-MALEK-7492';
  const assignedLawyerId = 'PER-LAWYER-B5';

  it('1. Mandatory Abdul Malek seed scenario exists with 7-month-old case & non-smartphone profile', async () => {
    const res = await request(app)
      .get(`/api/cases/${abdulCaseId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;
    assert.strictEqual(data.case_number, abdulCaseNumber);
    assert.strictEqual(data.citizen_inquiry_code, abdulInquiryCode);
    assert.strictEqual(data.assigned_lawyer_id, assignedLawyerId);
    assert.strictEqual(data.lawyer_status, 'SILENT_UNRESPONSIVE');
    assert.strictEqual(data.deadline_alert_level, 'CRITICAL_OVERDUE');
  });

  it('2. Case age is approximately 7 months according to the seeded timeline', async () => {
    const res = await request(app)
      .get(`/api/cases/${abdulCaseId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    const acct = res.body.data.lawyer_accountability;
    assert.ok(acct, 'lawyer_accountability metrics must be present');
    assert.ok(acct.case_age_months >= 6 && acct.case_age_months <= 8, `Expected case age ~7 months, got ${acct.case_age_months}`);
    assert.ok(acct.case_age_display.includes('months active'));
  });

  it('3. Assigned Panel Lawyer is correctly linked to the case and participants', async () => {
    const res = await request(app)
      .get(`/api/cases/${abdulCaseId}/people`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    assert.strictEqual(res.status, 200);
    const people = res.body.data;
    const lawyerParticipant = people.find(p => p.role_in_case === 'PANEL_LAWYER');
    assert.ok(lawyerParticipant, 'Panel Lawyer must be registered in case_people');
    assert.strictEqual(lawyerParticipant.person_id, assignedLawyerId);
  });

  it('4. Lawyer silence detection correctly calculates days inactive and overdue status', async () => {
    const res = await request(app)
      .get(`/api/cases/${abdulCaseId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    const acct = res.body.data.lawyer_accountability;
    assert.ok(acct.days_since_last_activity >= 90, `Expected days inactive >= 90, got ${acct.days_since_last_activity}`);
    assert.strictEqual(acct.accountability_status, 'ESCALATED');
    assert.ok(acct.escalation_reason.includes('no recorded activity'));
  });

  it('5. Deadline and overdue task TSK-005 is correctly identified', async () => {
    const res = await request(app)
      .get(`/api/cases/${abdulCaseId}/tasks`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    assert.strictEqual(res.status, 200);
    const tasks = res.body.data;
    const overdueTask = tasks.find(t => t.id === 'TSK-005');
    assert.ok(overdueTask, 'Overdue task TSK-005 must exist');
    assert.strictEqual(overdueTask.status, 'PENDING');
    assert.strictEqual(overdueTask.priority, 'URGENT');
    assert.ok(new Date(overdueTask.due_date) < new Date(), 'Task due date must be in the past');
  });

  it('6. B5 Panel Lawyer CAN access their assigned case', async () => {
    const res = await request(app)
      .get(`/api/cases/${abdulCaseId}`)
      .set('x-user-role', 'B5_PANEL_LAWYER')
      .set('x-user-id', assignedLawyerId);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.id, abdulCaseId);
  });

  it('7. B5 Panel Lawyer CANNOT access an unassigned case (403 Forbidden)', async () => {
    // Attempt to access Nuching Marma case (where B5 is NOT assigned)
    const unassignedCaseId = 'CASE-20260912-0004';
    const res = await request(app)
      .get(`/api/cases/${unassignedCaseId}`)
      .set('x-user-role', 'B5_PANEL_LAWYER')
      .set('x-user-id', assignedLawyerId);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('only authorized to access assigned cases'));

    // Verify ACCESS_DENIED audit log
    const auditRes = await request(app)
      .get(`/api/cases/${unassignedCaseId}/events`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    const denied = auditRes.body.data.filter(e => e.action === 'ACCESS_DENIED' && e.actor_id === assignedLawyerId);
    assert.ok(denied.length >= 1, 'Unauthorized lawyer case access must trigger ACCESS_DENIED audit entry');
  });

  it('8. B5 Panel Lawyer cannot directly mutate case status (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/cases/${abdulCaseId}/status`)
      .set('x-user-role', 'B5_PANEL_LAWYER')
      .set('x-user-id', assignedLawyerId)
      .send({ status: 'RESOLVED' });

    assert.strictEqual(res.status, 403);
  });

  it('9. DLAO Officer (B1) can review accountability information and trigger escalation', async () => {
    const escalateRes = await request(app)
      .post(`/api/cases/${abdulCaseId}/lawyer/escalate`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({
        reason: 'Panel lawyer silent for >100 days without court hearing report. Initiating formal review.',
        task_title: 'DLAO Formal Inactivity Show-Cause Notice'
      });

    assert.strictEqual(escalateRes.status, 200);
    assert.strictEqual(escalateRes.body.success, true);
    assert.ok(escalateRes.body.data.task, 'Escalation follow-up task must be generated');
    assert.strictEqual(escalateRes.body.data.task.priority, 'URGENT');

    // Verify LAWYER_ESCALATED audit event
    const auditRes = await request(app)
      .get(`/api/cases/${abdulCaseId}/events`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    const escalatedEvents = auditRes.body.data.filter(e => e.action === 'LAWYER_ESCALATED');
    assert.ok(escalatedEvents.length >= 1, 'LAWYER_ESCALATED event must be recorded in audit log');
  });

  it('10. Non-smartphone citizen status query works with Citizen Inquiry Code', async () => {
    const res = await request(app)
      .get(`/api/citizen/status?query=${abdulInquiryCode}`)
      .set('x-user-role', 'CITIZEN_APPLICANT')
      .set('x-user-id', 'PER-CITIZEN-MALEK');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;

    assert.strictEqual(data.case_number, abdulCaseNumber);
    assert.strictEqual(data.citizen_inquiry_code, abdulInquiryCode);
    assert.ok(data.current_status_plain, 'Must contain plain-language status');
    assert.ok(data.next_action, 'Must contain plain-language next action');
    assert.ok(data.case_age_display.includes('months active'));
    assert.strictEqual(data.simulation_notice, 'Telecom/USSD integration simulated for prototype.');
  });

  it('11. Non-smartphone citizen status query works with Case Number and Application ID', async () => {
    // By Case Number
    const resCaseNo = await request(app)
      .get(`/api/cases/citizen-status?query=${abdulCaseNumber}`);
    assert.strictEqual(resCaseNo.status, 200);
    assert.strictEqual(resCaseNo.body.data.case_number, abdulCaseNumber);

    // By Application ID
    const resAppId = await request(app)
      .get(`/api/citizen/status?query=${abdulAppId}`);
    assert.strictEqual(resAppId.status, 200);
    assert.strictEqual(resAppId.body.data.case_number, abdulCaseNumber);
  });

  it('12. Citizen status query response strictly enforces privacy (DO NOT expose internal/restricted info)', async () => {
    const res = await request(app)
      .get(`/api/citizen/status?query=${abdulInquiryCode}`);

    assert.strictEqual(res.status, 200);
    const data = res.body.data;

    // Verify restricted fields are NOT exposed
    assert.strictEqual(data.audit_trail, undefined, 'Internal audit trail must NOT be exposed');
    assert.strictEqual(data.events, undefined, 'Case events must NOT be exposed');
    assert.strictEqual(data.evidence, undefined, 'Sensitive evidence must NOT be exposed');
    assert.strictEqual(data.evidence_vault, undefined, 'Evidence vault must NOT be exposed');
    assert.strictEqual(data.safe_contacts, undefined, 'Safe contact restrictions must NOT be exposed');
    assert.strictEqual(data.lawyer_private_phone, undefined, 'Lawyer private phone must NOT be exposed');
    assert.strictEqual(data.staff_notes, undefined, 'Internal staff notes must NOT be exposed');
  });

  it('13. Citizen status query is audited with CITIZEN_STATUS_QUERIED', async () => {
    const auditRes = await request(app)
      .get(`/api/cases/${abdulCaseId}/events`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    assert.strictEqual(auditRes.status, 200);
    const queryLogs = auditRes.body.data.filter(e => e.action === 'CITIZEN_STATUS_QUERIED');
    assert.ok(queryLogs.length >= 1, 'CITIZEN_STATUS_QUERIED event must be logged');
  });

  it('14. Bangla status response is provided with understandable terminology', async () => {
    const res = await request(app)
      .get(`/api/citizen/status?query=${abdulInquiryCode}`);

    assert.strictEqual(res.status, 200);
    const data = res.body.data;
    assert.ok(data.current_status_plain_bn, 'Must have Bangla status');
    assert.ok(data.next_action_bn, 'Must have Bangla next action');
    assert.ok(data.case_age_display_bn.includes('মাস'));
    assert.ok(data.simulation_notice_bn.includes('সিমুলেট'));
  });

  it('15. Panel Lawyer can record legitimate case activity, updating status & auditing LAWYER_ACTIVITY_RECORDED', async () => {
    const actRes = await request(app)
      .post(`/api/cases/${abdulCaseId}/lawyer/activity`)
      .set('x-user-role', 'B5_PANEL_LAWYER')
      .set('x-user-id', assignedLawyerId)
      .send({
        activity_type: 'HEARING_PROGRESS_REPORT',
        notes: 'Submitted certified copy of Title Suit 44/2026 proceedings to DLAO Sylhet.',
        task_id: 'TSK-005'
      });

    assert.strictEqual(actRes.status, 200);
    assert.strictEqual(actRes.body.success, true);
    assert.strictEqual(actRes.body.data.lawyer_status, 'ACTIVE');
    assert.strictEqual(actRes.body.data.deadline_alert_level, 'NORMAL');

    // Verify LAWYER_ACTIVITY_RECORDED in audit trail
    const auditRes = await request(app)
      .get(`/api/cases/${abdulCaseId}/events`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    const activityLogs = auditRes.body.data.filter(e => e.action === 'LAWYER_ACTIVITY_RECORDED');
    assert.ok(activityLogs.length >= 1, 'LAWYER_ACTIVITY_RECORDED audit entry must exist');
  });

  it('16. Audit log immutability prevents tampering with lawyer accountability history', () => {
    const db = getDb(testDbPath);
    assert.throws(() => {
      db.prepare(`UPDATE audit_log SET notes = 'tampered' WHERE case_id = ?`).run(abdulCaseId);
    }, /IMMUTABLE_VIOLATION/);

    assert.throws(() => {
      db.prepare(`DELETE FROM audit_log WHERE case_id = ?`).run(abdulCaseId);
    }, /IMMUTABLE_VIOLATION/);
  });
});
