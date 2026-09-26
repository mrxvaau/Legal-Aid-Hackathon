const path = require('path');
const fs = require('fs');

// Set test environment database
const testDbPath = path.resolve(__dirname, '../data/test-duplicate.sqlite');
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
const duplicateDetectionService = require('../src/services/duplicateDetectionService');
const { ROLES } = require('../src/utils/constants');

describe('T4 Duplicate / Fraud Detection System', () => {
  before(() => {
    const db = getDb(testDbPath);
    seed(db);

    // Seed additional distinct sample benchmark persons
    const samplePeople = [
      { id: 'BENCH-PER-05', national_id: 'NID-199011112222', full_name: 'Fatema Begum', phone: '01711223344', district: 'Cumilla', division: 'Chattogram' },
      { id: 'BENCH-PER-06', national_id: 'NID-198533334444', full_name: 'Mohammad Rahim', phone: '01811556677', district: 'Barishal', division: 'Barishal' },
      { id: 'BENCH-PER-07', national_id: 'NID-199255556666', full_name: 'Shirin Sultana', phone: '01911778899', district: 'Khulna', division: 'Khulna' },
      { id: 'BENCH-PER-08', national_id: 'NID-198777778888', full_name: 'Anisur Rahman', phone: '01611990011', district: 'Rajshahi', division: 'Rajshahi' },
      { id: 'BENCH-PER-09', national_id: 'NID-199599990000', full_name: 'Tania Khatun', phone: '01511223344', district: 'Rangpur', division: 'Rangpur' },
      { id: 'BENCH-PER-10', national_id: 'NID-198312345678', full_name: 'Kamal Hossain', phone: '01722334455', district: 'Mymensingh', division: 'Mymensingh' },
      { id: 'BENCH-PER-11', national_id: 'NID-199987654321', full_name: 'Rashedul Islam', phone: '01833445566', district: 'Bogura', division: 'Rajshahi' },
      { id: 'BENCH-PER-12', national_id: 'NID-200234567890', full_name: 'Nasrin Akter', phone: '01944556677', district: 'Gazipur', division: 'Dhaka' },
      { id: 'BENCH-PER-13', national_id: 'NID-197812121212', full_name: 'Golam Mustafa', phone: '01733221100', district: 'Faridpur', division: 'Dhaka' },
      { id: 'BENCH-PER-14', national_id: 'NID-199145454545', full_name: 'Rabeya Basri', phone: '01844332211', district: 'Jessore', division: 'Khulna' }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO people (id, national_id, full_name, phone, district, division)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const p of samplePeople) {
      insertStmt.run(p.id, p.national_id, p.full_name, p.phone, p.district, p.division);
    }
  });

  it('1. Genuine Duplicate: detects exact NID match with high confidence (>=95%)', () => {
    // Moyuri Akter with exact NID NID-199856100101 from seed
    const result = duplicateDetectionService.checkDuplicate({
      name: 'Moyuri Akter',
      national_id: 'NID-199856100101',
      phone: '01700998877'
    });

    assert.equal(result.is_duplicate_suspected, true);
    assert.ok(result.confidence_score >= 95, `Expected score >= 95, got ${result.confidence_score}`);
    assert.equal(result.recommendation, 'FLAG_FOR_HUMAN_REVIEW');
    assert.equal(result.auto_rejected, false, 'GUARDRAIL: Never auto-reject');
    assert.equal(result.auto_merged, false, 'GUARDRAIL: Never auto-merge');
  });

  it('2. Genuine Duplicate: detects fuzzy name + exact phone with high confidence (>=80%)', () => {
    // Mohammad Rahim from BENCH-PER-06 with exact phone 01811556677 and fuzzy spelling
    const result = duplicateDetectionService.checkDuplicate({
      name: 'Muhammad Raheem', // fuzzy spelling
      phone: '01811556677'
    });

    assert.equal(result.is_duplicate_suspected, true);
    assert.ok(result.confidence_score >= 80, `Expected score >= 80, got ${result.confidence_score}`);
    assert.equal(result.recommendation, 'FLAG_FOR_HUMAN_REVIEW');
    assert.equal(result.auto_rejected, false);
    assert.equal(result.auto_merged, false);
  });

  it('3. Trap Case 1: same name "Moyuri Akter" but different verified NID is NOT auto-rejected or flagged as duplicate', () => {
    // Trap Case 1: Same common name as Moyuri, but different NID and different phone
    const result = duplicateDetectionService.checkDuplicate({
      name: 'Moyuri Akter',
      national_id: 'NID-198811223344', // Different NID!
      phone: '01755112233'
    });

    assert.equal(result.trap_case_detected, true, 'Trap case must be detected');
    assert.equal(result.is_duplicate_suspected, false, 'Must NOT suspect duplicate for trap case');
    assert.ok(result.confidence_score <= 35, `Expected score <= 35, got ${result.confidence_score}`);
    assert.equal(result.recommendation, 'PROCEED');
    assert.equal(result.auto_rejected, false, 'GUARDRAIL: Must NOT auto-reject trap case');
    assert.equal(result.auto_merged, false, 'GUARDRAIL: Must NOT auto-merge trap case');
  });

  it('4. Trap Case 2: same name "Abdul Malek" but different verified NID is NOT auto-rejected or flagged', () => {
    // Trap Case 2: Common rural name as Abdul Malek, different NID
    const result = duplicateDetectionService.checkDuplicate({
      name: 'Abdul Malek',
      national_id: 'NID-197544332211', // Different NID!
      phone: '01988776655'
    });

    assert.equal(result.trap_case_detected, true, 'Trap case must be detected');
    assert.equal(result.is_duplicate_suspected, false);
    assert.ok(result.confidence_score <= 35, `Expected score <= 35, got ${result.confidence_score}`);
    assert.equal(result.auto_rejected, false);
    assert.equal(result.auto_merged, false);
  });

  it('5. Guardrail: when duplicate is flagged, creates human-review task and logs decision in audit_log', () => {
    const db = getDb();
    const result = duplicateDetectionService.checkDuplicate({
      name: 'Mohammad Rahim',
      phone: '01811556677',
      application_id: 'APP-TEST-DUP-01',
      case_id: 'CASE-20260901-0001'
    }, { id: 'PER-OFFICER-B1', role: ROLES.B1_DLAO_OFFICER });

    assert.equal(result.is_duplicate_suspected, true);
    assert.ok(result.task_id, 'Task ID must be generated for officer review');

    // Verify task exists in DB
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.task_id);
    assert.ok(task, 'Task record must exist in DB');
    assert.equal(task.assigned_to_role, ROLES.B1_DLAO_OFFICER);

    // Verify decision path written to audit_log
    const audit = db.prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC LIMIT 1')
      .get('DUPLICATE_CHECK_PERFORMED');
    assert.ok(audit, 'Audit log entry must exist for duplicate check');
    assert.ok(audit.notes.includes('no auto-rejection or auto-merge'), 'Audit log must record guardrail');
  });

  it('6. API Endpoint: POST /api/applications/check-duplicate returns correct payload and HTTP 200', async () => {
    const res = await request(app)
      .post('/api/applications/check-duplicate')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({
        name: 'Kamal Hossain',
        phone: '01722334455', // exact match with BENCH-PER-10
        national_id: 'NID-198312345678'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.is_duplicate_suspected, true);
    assert.ok(res.body.data.confidence_score >= 95);
    assert.equal(res.body.data.auto_rejected, false);
    assert.equal(res.body.data.auto_merged, false);
  });
});
