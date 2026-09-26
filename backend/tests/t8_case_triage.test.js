const path = require('path');
const fs = require('fs');

// Set test environment database
const testDbPath = path.resolve(__dirname, '../data/test-triage.sqlite');
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

describe('T8 Multi-Agent Case Triage & Component Disagreement Surfacing', () => {
  const caseIds = {
    labour: 'CAS-TRG-LABOUR',
    chtLand: 'CAS-TRG-CHTLAND',
    cyber: 'CAS-TRG-CYBER',
    routineFamily: 'CAS-TRG-ROUTINE-FAM',
    conflictDomesticViolence: 'CAS-TRG-CONFLICT-DV'
  };

  before(() => {
    const db = getDb(testDbPath);
    seed(db);

    const insertPerson = db.prepare(`
      INSERT INTO people (id, national_id, full_name, phone, district, division)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPerson.run('PER-TRG-01', 'NID-TRG-01', 'Anisur Rahman', '01711100001', 'Gazipur', 'Dhaka');
    insertPerson.run('PER-TRG-02', 'NID-TRG-02', 'Nuching Marma', '01711100002', 'Rangamati', 'Chattogram');
    insertPerson.run('PER-TRG-03', 'NID-TRG-03', 'Nabila Sultana', '01711100003', 'Dhaka', 'Dhaka');
    insertPerson.run('PER-TRG-04', 'NID-TRG-04', 'Shirin Akter', '01711100004', 'Cumilla', 'Chattogram');
    insertPerson.run('PER-TRG-05', 'NID-TRG-05', 'Rehana Parvin', '01711100005', 'Dhaka', 'Dhaka');

    const insertApp = db.prepare(`
      INSERT INTO applications (id, applicant_id, category, intake_channel, intake_office, status, summary, created_by_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertApp.run('APP-TRG-01', 'PER-TRG-01', 'LABOUR_DISPUTE', 'DIRECT_WALKIN', 'DLAO Gazipur', 'APPROVED', 'Unpaid overtime salary and garment factory termination arrears', ROLES.B1_DLAO_OFFICER);
    insertApp.run('APP-TRG-02', 'PER-TRG-02', 'INDIGENOUS_RIGHTS', 'UDC_ASSISTED', 'DLAO Rangamati', 'APPROVED', 'Ancestral jhum land eviction and boundary dispute in Baghaichhari CHT', ROLES.B4_UDC_ENTREPRENEUR);
    insertApp.run('APP-TRG-03', 'PER-TRG-03', 'GENDER_VIOLENCE', 'DIRECT_WALKIN', 'DLAO Dhaka', 'APPROVED', 'Morphed photo blackmail and social media cyber extortion', ROLES.B1_DLAO_OFFICER);
    insertApp.run('APP-TRG-04', 'PER-TRG-04', 'FAMILY_DISPUTE', 'DIRECT_WALKIN', 'DLAO Cumilla', 'APPROVED', 'Routine spousal dower payment and maintenance calculation', ROLES.B1_DLAO_OFFICER);
    // Conflict case: family dispute category, but extreme physical violence and child abduction threats
    insertApp.run('APP-TRG-05', 'PER-TRG-05', 'FAMILY_DISPUTE', 'DIRECT_WALKIN', 'DLAO Dhaka', 'APPROVED', 'Husband physical assault with weapon, death threat to kill applicant, and minor child held hostage', ROLES.B1_DLAO_OFFICER);

    const insertCase = db.prepare(`
      INSERT INTO cases (id, application_id, case_number, title, category, status, priority, intake_office, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCase.run(caseIds.labour, 'APP-TRG-01', 'DLAO-GZP-2026-001', 'Anisur vs Tex Garments Wage Claim', 'LABOUR_DISPUTE', 'IN_PROGRESS', 'MEDIUM', 'DLAO Gazipur', 'Unpaid 4 months wages');
    insertCase.run(caseIds.chtLand, 'APP-TRG-02', 'DLAO-RNG-2026-002', 'Nuching Marma Mouza Land Protection', 'INDIGENOUS_RIGHTS', 'IN_PROGRESS', 'HIGH', 'DLAO Rangamati', 'Eviction notice issued against customary ancestral hills');
    insertCase.run(caseIds.cyber, 'APP-TRG-03', 'DLAO-DHK-2026-003', 'Nabila Cyber Blackmail Takedown', 'CYBER_HARASSMENT', 'IN_PROGRESS', 'URGENT', 'DLAO Dhaka', 'Extortionist threatens to post morphed images online');
    insertCase.run(caseIds.routineFamily, 'APP-TRG-04', 'DLAO-CUM-2026-004', 'Shirin vs Kamal Spousal Maintenance', 'FAMILY_DISPUTE', 'IN_PROGRESS', 'MEDIUM', 'DLAO Cumilla', 'Nikahnama dower reconciliation and monthly child allowance');
    insertCase.run(caseIds.conflictDomesticViolence, 'APP-TRG-05', 'DLAO-DHK-2026-005', 'Rehana Emergency Protection Against Violence', 'FAMILY_DISPUTE', 'IN_PROGRESS', 'MEDIUM', 'DLAO Dhaka', 'Husband armed attack, severe battery, threats to kill, child detained');
  });

  it('1. Case 1 (Labour Dispute): Correctly classifies category, medium risk, and Labour Court routing', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseIds.labour}/triage`)
      .set('x-user-id', 'OFFICER-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const data = res.body.data;
    assert.equal(data.categorization.category, 'LABOUR_DISPUTE');
    assert.equal(data.risk.risk_level, 'MEDIUM');
    assert.ok(data.jurisdiction.recommended_authority.includes('Labour Court'));
    assert.equal(data.has_conflict, false);
  });

  it('2. Case 2 (CHT Indigenous Land): Routes to Mouza Headman Customary Bench with high risk', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseIds.chtLand}/triage`)
      .set('x-user-id', 'OFFICER-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER);

    assert.equal(res.status, 201);
    const data = res.body.data;
    assert.equal(data.categorization.category, 'INDIGENOUS_LAND_RIGHTS');
    assert.equal(data.risk.risk_level, 'HIGH');
    assert.ok(data.jurisdiction.recommended_authority.includes('Headman'));
    assert.equal(data.has_conflict, false);
  });

  it('3. Case 3 (Cyber Harassment): Categorizes cyber offense and recommends PCSW referral', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseIds.cyber}/triage`)
      .set('x-user-id', 'OFFICER-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER);

    assert.equal(res.status, 201);
    const data = res.body.data;
    assert.equal(data.categorization.category, 'CYBER_HARASSMENT');
    assert.equal(data.risk.risk_level, 'URGENT');
    assert.ok(data.jurisdiction.recommended_authority.includes('Police Cyber Support for Women'));
  });

  it('4. Case 4 (Routine Family Dispute): Recommends standard DLAO Mediation Board with medium priority', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseIds.routineFamily}/triage`)
      .set('x-user-id', 'OFFICER-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER);

    assert.equal(res.status, 201);
    const data = res.body.data;
    assert.equal(data.categorization.category, 'FAMILY_DISPUTE');
    assert.equal(data.risk.risk_level, 'MEDIUM');
    assert.ok(data.jurisdiction.recommended_authority.includes('Mediation Board'));
    assert.equal(data.has_conflict, false);
  });

  it('5. Case 5 (CONFLICT CASE): Explicitly surfaces disagreement between Risk (URGENT/Violence) and Jurisdiction (Routine ADR)', async () => {
    const res = await request(app)
      .post(`/api/cases/${caseIds.conflictDomesticViolence}/triage`)
      .set('x-user-id', 'OFFICER-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER);

    assert.equal(res.status, 201);
    const data = res.body.data;

    // Categorization says family
    assert.equal(data.categorization.category, 'FAMILY_DISPUTE');

    // Risk agent flags URGENT with violent indicators
    assert.equal(data.risk.risk_level, 'URGENT');
    assert.ok(data.risk.urgent_indicators.length > 0);

    // CRITICAL REQUIREMENT: Must surface conflict explicitly without silently resolving
    assert.equal(data.has_conflict, true, 'Conflict between risk and jurisdiction must be true');
    assert.ok(data.conflict_details, 'conflict_details object must be populated');
    assert.equal(data.conflict_details.conflict_type, 'URGENCY_VS_ROUTINE_ADR_MISMATCH');
    assert.ok(data.conflict_details.description.includes('Mediation is unsafe in domestic violence'));
    assert.ok(data.recommended_action.includes('Officer review required due to detected component conflict'));
  });

  it('6. GUARDRAIL: Human Officer overrides triage recommendation, records in audit_log and updates case priority', async () => {
    // Run triage first to get triage ID
    const triageRes = await request(app)
      .post(`/api/cases/${caseIds.conflictDomesticViolence}/triage`)
      .set('x-user-id', 'OFFICER-01')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER);

    const triageId = triageRes.body.data.id;
    assert.ok(triageId);

    // Officer executes override: Bypass ADR mediation, route immediately to One-Stop Crisis Centre & Family Court
    const overrideRes = await request(app)
      .post(`/api/cases/${caseIds.conflictDomesticViolence}/triage/${triageId}/override`)
      .set('x-user-id', 'SENIOR-OFFICER-AHMED')
      .set('x-user-role', ROLES.B1_DLAO_OFFICER)
      .send({
        override_priority: 'URGENT',
        override_authority: 'Family Court & One-Stop Crisis Centre (OCC) Safe Shelter Network',
        override_reason: 'Confirmed imminent physical danger. Routine ADR is contraindicated under Section 5 Domestic Violence Act.'
      });

    assert.equal(overrideRes.status, 200, `Failed to override triage: ${JSON.stringify(overrideRes.body)}`);
    assert.equal(overrideRes.body.success, true);
    assert.equal(overrideRes.body.data.is_overridden, true);
    assert.equal(overrideRes.body.data.final_priority, 'URGENT');
    assert.ok(overrideRes.body.data.final_authority.includes('One-Stop Crisis Centre'));

    // Check case table was updated with new priority
    const db = getDb(testDbPath);
    const caseRow = db.prepare('SELECT priority FROM cases WHERE id = ?').get(caseIds.conflictDomesticViolence);
    assert.equal(caseRow.priority, 'URGENT');

    // Check audit log contains TRIAGE_OVERRIDDEN event
    const auditRow = db.prepare(`
      SELECT * FROM audit_log WHERE case_id = ? AND action = 'TRIAGE_OVERRIDDEN'
    `).get(caseIds.conflictDomesticViolence);

    assert.ok(auditRow, 'TRIAGE_OVERRIDDEN audit event must exist');
    assert.equal(auditRow.actor_id, 'SENIOR-OFFICER-AHMED');
    const payload = JSON.parse(auditRow.payload_after);
    assert.equal(payload.priority, 'URGENT');
    assert.ok(payload.override_reason.includes('Section 5 Domestic Violence Act'));
  });
});
