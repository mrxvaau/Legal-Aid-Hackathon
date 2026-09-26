const path = require('path');
const fs = require('fs');

// Set test environment database
const testDbPath = path.resolve(__dirname, '../data/test-ripon-accessibility.sqlite');
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

describe('A2 Ripon Independent Accessible Applicant Journey', () => {
  const riponPersonId = 'PER-CITIZEN-RIPON';
  const moyuriCaseId = 'CASE-20260901-0001';
  const riponStandaloneCaseId = 'CASE-20260920-RIPON';
  const riponInquiryCode = '16699-RIPON-8888';

  before(() => {
    const db = getDb(testDbPath);
    seed(db);
  });

  it('1. Confirms Ripon exists both as Moyuri\'s representative AND as a standalone primary applicant in his own distinct case', () => {
    const db = getDb(testDbPath);

    // Check Moyuri's case: Ripon is AUTHORIZED_REPRESENTATIVE
    const moyuriLink = db.prepare(`
      SELECT * FROM case_people WHERE case_id = ? AND person_id = ?
    `).get(moyuriCaseId, riponPersonId);

    assert.ok(moyuriLink, 'Ripon must be linked to Moyuri\'s case');
    assert.equal(moyuriLink.role_in_case, 'AUTHORIZED_REPRESENTATIVE');
    assert.equal(moyuriLink.relationship_to_applicant, 'BROTHER');

    // Check Ripon's own case: Ripon is APPLICANT (SELF)
    const riponLink = db.prepare(`
      SELECT * FROM case_people WHERE case_id = ? AND person_id = ?
    `).get(riponStandaloneCaseId, riponPersonId);

    assert.ok(riponLink, 'Ripon must be linked to his own standalone case');
    assert.equal(riponLink.role_in_case, 'APPLICANT');
    assert.equal(riponLink.relationship_to_applicant, 'SELF');
    assert.equal(riponLink.is_primary_contact, 1);

    // Verify application record
    const riponApp = db.prepare(`
      SELECT * FROM applications WHERE id = 'APP-20260920-RIPON'
    `).get();

    assert.ok(riponApp);
    assert.equal(riponApp.applicant_id, riponPersonId);
    assert.equal(riponApp.representative_id, null, 'Ripon is self-represented in his own case');
  });

  it('2. Ripon independently queries his own case status via accessible non-visual pathway without CAPTCHA or visual OTP', async () => {
    // Non-visual voice-first / screen-reader citizen status inquiry using inquiry code
    const res = await request(app)
      .get(`/api/citizen/status?query=${riponInquiryCode}`);

    assert.equal(res.status, 200, `Inquiry failed: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    // Confirm it fetched Ripon's standalone case, NOT Moyuri's case
    assert.equal(data.case_number, 'DLAO-DHK-2026-0888');
    assert.equal(data.applicant_name, 'Ripon');
    assert.ok(data.title.includes('Ripon vs Dhaka Metro Bus Consortium'));

    // Verify screen-reader friendly plain-language status
    assert.ok(data.current_status_plain.includes('A panel lawyer has been assigned'));
    assert.ok(data.current_status_plain_bn.includes('প্যানেল আইনজীবী নিয়োগ করা হয়েছে'));

    // Accessible verification: Zero CAPTCHA challenge in response, zero visual-only blocker
    assert.equal(data.requires_captcha, undefined);
    assert.equal(data.requires_visual_otp, undefined);
  });

  it('3. Ripon can also independently query status using his NID or Application ID without a sighted helper', async () => {
    // Query by application ID
    const resApp = await request(app)
      .get('/api/citizen/status?query=APP-20260920-RIPON');

    assert.equal(resApp.status, 200);
    assert.equal(resApp.body.success, true);
    assert.equal(resApp.body.data.case_number, 'DLAO-DHK-2026-0888');

    // Query by case number
    const resCase = await request(app)
      .get('/api/citizen/status?query=DLAO-DHK-2026-0888');

    assert.equal(resCase.status, 200);
    assert.equal(resCase.body.success, true);
    assert.equal(resCase.body.data.case_number, 'DLAO-DHK-2026-0888');
  });

  it('4. Accessibility Profile in Person Record guarantees non-visual interaction preferences', () => {
    const db = getDb(testDbPath);
    const person = db.prepare('SELECT socio_economic_profile FROM people WHERE id = ?').get(riponPersonId);
    assert.ok(person);
    const profile = JSON.parse(person.socio_economic_profile);

    assert.equal(profile.accessibility.visual_impairment, true);
    assert.equal(profile.accessibility.interaction_mode, 'NON_VISUAL_VOICE_FIRST');
    assert.equal(profile.accessibility.screen_reader, true);
    assert.equal(profile.accessibility.no_captcha_required, true);
    assert.equal(profile.accessibility.no_visual_otp_required, true);
  });
});
