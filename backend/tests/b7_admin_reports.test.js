const path = require('path');
const fs = require('fs');

// Set test environment database
const testDbPath = path.resolve(__dirname, '../data/test-b7-reports.sqlite');
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

describe('B7 DLAO Admin / Case-Support Staff: Search & Operations Reporting', () => {
  before(() => {
    const db = getDb(testDbPath);
    seed(db);

    // Insert an overdue task for testing the overdue task reporting
    db.prepare(`
      INSERT INTO tasks (
        id, case_id, title, title_bn, description, assigned_to_role,
        assigned_to_user_id, due_date, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'TSK-OVERDUE-01',
      'CASE-20260901-0001',
      'Overdue Police Incident Verification',
      'মেয়াদোত্তীর্ণ পুলিশ প্রতিবেদন যাচাই',
      'Outstanding General Diary verification from Thana',
      ROLES.B7_DLAO_ADMIN,
      'PER-ADMIN-B7',
      '2026-08-01', // Explicit past date (overdue)
      'URGENT',
      'PENDING'
    );
  });

  it('1. GET /api/cases/search?q=Moyuri finds case by applicant full name', async () => {
    const res = await request(app)
      .get('/api/cases/search?q=Moyuri')
      .set('x-user-role', ROLES.B7_DLAO_ADMIN)
      .set('x-user-id', 'PER-ADMIN-B7');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.count >= 1);
    assert.ok(res.body.data.some(c => c.applicant_name === 'Moyuri Akter'));
  });

  it('2. GET /api/cases/search?q=NID-199856100101 finds case by National ID', async () => {
    const res = await request(app)
      .get('/api/cases/search?q=NID-199856100101')
      .set('x-user-role', ROLES.B7_DLAO_ADMIN)
      .set('x-user-id', 'PER-ADMIN-B7');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].applicant_nid, 'NID-199856100101');
  });

  it('3. GET /api/cases/search?q=DLAO-DHK-2026-0914 finds case by Case Number', async () => {
    const res = await request(app)
      .get('/api/cases/search?q=DLAO-DHK-2026-0914')
      .set('x-user-role', ROLES.B7_DLAO_ADMIN)
      .set('x-user-id', 'PER-ADMIN-B7');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.some(c => c.case_number === 'DLAO-DHK-2026-0914'));
  });

  it('4. GET /api/cases/search?q=16699-MALEK-7492 finds case by Citizen Tracking Token', async () => {
    const res = await request(app)
      .get('/api/cases/search?q=16699-MALEK-7492')
      .set('x-user-role', ROLES.B7_DLAO_ADMIN)
      .set('x-user-id', 'PER-ADMIN-B7');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.some(c => c.citizen_inquiry_code === '16699-MALEK-7492'));
  });

  it('5. GET /api/cases/search returns empty array for non-matching query', async () => {
    const res = await request(app)
      .get('/api/cases/search?q=NON_EXISTENT_CASE_QUERY_999')
      .set('x-user-role', ROLES.B7_DLAO_ADMIN)
      .set('x-user-id', 'PER-ADMIN-B7');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 0);
    assert.equal(res.body.data.length, 0);
  });

  it('6. GET /api/reports/case-summary generates comprehensive auto-report for DLAO Admin without physical files', async () => {
    const res = await request(app)
      .get('/api/reports/case-summary')
      .set('x-user-role', ROLES.B7_DLAO_ADMIN)
      .set('x-user-id', 'PER-ADMIN-B7');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const report = res.body.data;

    // Check report structure
    assert.ok(report.report_name);
    assert.ok(report.generated_at);
    assert.ok(report.summary_metrics.total_cases >= 4, 'Should count at least the 4 seeded cases');

    // Check status counts
    assert.ok(report.cases_by_status);
    assert.ok(typeof report.cases_by_status === 'object');

    // Check category counts
    assert.ok(report.cases_by_category);
    assert.ok(report.cases_by_category.GENDER_VIOLENCE >= 1 || report.cases_by_category.LAND_DISPUTE >= 1);

    // Check overdue tasks list
    assert.ok(Array.isArray(report.overdue_tasks));
    assert.ok(report.summary_metrics.overdue_tasks_count >= 1, 'Should detect at least 1 overdue task');
    assert.ok(report.overdue_tasks.some(t => t.id === 'TSK-OVERDUE-01'));

    // Check lawyer accountability breakdown
    assert.ok(report.lawyer_accountability_summary);
  });
});
