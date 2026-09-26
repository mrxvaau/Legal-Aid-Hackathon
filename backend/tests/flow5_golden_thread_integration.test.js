const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

const testDbPath = path.resolve(__dirname, '../data/test-flow5-golden-thread.sqlite');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { seed } = require('../src/db/seed');
const { getDb } = require('../src/db/connection');
const { ROLES, CASE_STATES, AUDIT_ACTIONS } = require('../src/utils/constants');

describe('FLOW 5: Golden Thread Integration, Role Boundaries & Full System Audit', () => {
  before(() => {
    seed(getDb(testDbPath));
  });

  // ==========================================================================
  // SECTION 1: THE GOLDEN THREAD CONTINUOUS TRACEABILITY
  // ==========================================================================
  it('1. Bidirectional Application ➔ Case traceability works seamlessly', async () => {
    // 1a. Applications list includes linked case information
    const appListRes = await request(app)
      .get('/api/applications')
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(appListRes.status, 200);
    assert.ok(Array.isArray(appListRes.body.data));
    assert.strictEqual(appListRes.body.data.length, 4);

    const moyuriApp = appListRes.body.data.find(a => a.id === 'APP-20260901-0001');
    assert.ok(moyuriApp);
    assert.strictEqual(moyuriApp.linked_case_id, 'CASE-20260901-0001');
    assert.strictEqual(moyuriApp.linked_case_number, 'DLAO-DHK-2026-0042');
    assert.strictEqual(moyuriApp.linked_case_status, CASE_STATES.MEDIATION);

    // 1b. Case details contains original application metadata and all golden thread entities
    const caseRes = await request(app)
      .get('/api/cases/CASE-20260901-0001')
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(caseRes.status, 200);
    const caseData = caseRes.body.data;
    assert.strictEqual(caseData.application_id, 'APP-20260901-0001');
    assert.strictEqual(caseData.intake_channel, 'DLAO_WALKIN');
    assert.ok(caseData.people && caseData.people.length >= 3);
    assert.ok(caseData.provenance && caseData.provenance.length >= 1);
    assert.ok(caseData.tasks && caseData.tasks.length >= 1);
    assert.ok(caseData.audit_trail && caseData.audit_trail.length >= 2);
    assert.ok(caseData.safe_contacts && caseData.safe_contacts.length >= 1);
  });

  // ==========================================================================
  // SECTION 2: SCENARIO 1 — MOYURI AKTER & RIPON
  // ==========================================================================
  it('2. Scenario 1: Safe contact protection active, Ripon authorized representative, secondhand provenance preserved', async () => {
    const res = await request(app)
      .get('/api/cases/CASE-20260901-0001')
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(res.status, 200);
    const c = res.body.data;

    // Verify safe contact
    const sc = c.safe_contacts[0];
    assert.ok(sc);
    assert.strictEqual(sc.is_safe_contact_active, 1);
    assert.strictEqual(sc.preferred_contact_method, 'IN_PERSON_REPRESENTATIVE');
    assert.ok(sc.restriction_reason.toLowerCase().includes('husband'));

    // Verify representative relationship
    const rep = c.people.find(p => p.role_in_case === 'AUTHORIZED_REPRESENTATIVE');
    assert.ok(rep);
    assert.strictEqual(rep.person_id, 'PER-CITIZEN-RIPON');
    assert.strictEqual(rep.relationship_to_applicant, 'BROTHER');
    assert.strictEqual(rep.is_primary_contact, 1);

    // Verify secondhand reporting provenance
    const prov = c.provenance.find(p => p.is_secondhand_report === 1);
    assert.ok(prov);
    assert.strictEqual(prov.author_id, 'PER-CITIZEN-RIPON');
    assert.strictEqual(prov.reported_for_person_id, 'PER-CITIZEN-MOYURI');

    // Representative cannot mutate case status directly (403)
    const updateRes = await request(app)
      .patch('/api/cases/CASE-20260901-0001/status')
      .set('x-user-role', 'AUTHORIZED_REPRESENTATIVE')
      .set('x-user-id', 'PER-CITIZEN-RIPON')
      .send({ status: 'RESOLVED' });

    assert.strictEqual(updateRes.status, 403);
  });

  // ==========================================================================
  // SECTION 3: SCENARIO 2 — NUCHING MARMA & UDC ASSISTED INTAKE
  // ==========================================================================
  it('3. Scenario 2: 5-Stage Provenance Chain & UDC Role Boundaries', async () => {
    const res = await request(app)
      .get('/api/cases/CASE-20260912-0004')
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(res.status, 200);
    const provs = res.body.data.provenance;
    assert.ok(provs.length >= 5);

    // Verify all 5 stages exist
    const stage1 = provs.find(p => p.source_type === 'spoken_by_person' && p.source_language === 'marma');
    const stage2 = provs.find(p => p.source_type === 'translated' && p.source_language === 'marma' && p.target_language === 'bn');
    const stage3 = provs.find(p => p.source_type === 'typed_by_staff');
    const stage4 = provs.find(p => p.source_type === 'ai_assisted');
    const stage5 = provs.find(p => p.source_type === 'confirmed_by_human');

    assert.ok(stage1, 'Stage 1: Spoken by person in Marma');
    assert.ok(stage2, 'Stage 2: Translated by UDC to Bangla');
    assert.ok(stage3, 'Stage 3: Typed by staff at UDC terminal');
    assert.ok(stage4, 'Stage 4: AI assisted classification (non-binding)');
    assert.ok(stage5, 'Stage 5: Human confirmed by DLAO Officer');

    // Verify UDC Entrepreneur cannot confirm provenance (403)
    const udcConfirmRes = await request(app)
      .post('/api/cases/CASE-20260912-0004/provenance/PRV-006/confirm')
      .set('x-user-role', 'B4_UDC_ENTREPRENEUR')
      .set('x-user-id', 'PER-UDC-B4');

    assert.strictEqual(udcConfirmRes.status, 403);
  });

  // ==========================================================================
  // SECTION 4: SCENARIO 3 — NABILA: SENSITIVE EVIDENCE & PCSW REFERRAL
  // ==========================================================================
  it('4. Scenario 3: Sensitive Evidence Vault & Tracked Referral Ownership', async () => {
    const caseId = 'CASE-20260910-0003';

    // 4a. Authorized DLAO Officer can view sensitive evidence
    const authEvRes = await request(app)
      .get(`/api/cases/${caseId}/evidence`)
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(authEvRes.status, 200);
    const evItems = authEvRes.body.data;
    assert.ok(evItems.some(e => e.sensitivity_level === 'STRICTLY_RESTRICTED_IMAGE_ABUSE'));

    // 4b. Unauthorized role (Helpline Agent B3) is strictly blocked from sensitive evidence (403)
    const unauthEvRes = await request(app)
      .get(`/api/cases/${caseId}/evidence/EV-20260910-001`)
      .set('x-user-role', 'B3_HELPLINE_AGENT')
      .set('x-user-id', 'PER-HELPLINE-B3');

    assert.strictEqual(unauthEvRes.status, 403);

    // 4c. Referral tracking: Police Cyber Support for Women with ownership & acknowledgement
    const caseRes = await request(app)
      .get(`/api/cases/${caseId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER');

    const referral = caseRes.body.data.referrals.find(r => r.id === 'REF-002');
    assert.ok(referral);
    assert.strictEqual(referral.receiving_office, 'Police Cyber Support for Women (PCSW) - CID HQ');
    assert.strictEqual(referral.acknowledgement_status, 'ACKNOWLEDGED');
    assert.strictEqual(referral.assigned_officer_id, 'OFFICER-CID-CYBER-88');
  });

  // ==========================================================================
  // SECTION 5: SCENARIO 4 — ABDUL MALEK: LAWYER SILENCE & NON-SMARTPHONE STATUS
  // ==========================================================================
  it('5. Scenario 4: Case age, silence calculation, escalation, and non-smartphone query', async () => {
    const caseId = 'CASE-20260220-0005';

    // 5a. DLAO Officer inspects lawyer accountability
    const caseRes = await request(app)
      .get(`/api/cases/${caseId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(caseRes.status, 200);
    const c = caseRes.body.data;
    assert.ok(c.lawyer_accountability);
    assert.strictEqual(c.lawyer_accountability.accountability_status, 'ESCALATED');
    assert.ok(c.lawyer_accountability.days_since_last_activity >= 90);
    assert.strictEqual(c.lawyer_accountability.is_deadline_passed, true);

    // 5b. Non-smartphone citizen status query using Citizen Inquiry Code
    const citizenRes = await request(app)
      .get('/api/citizen/status?query=16699-MALEK-7492');

    assert.strictEqual(citizenRes.status, 200);
    assert.strictEqual(citizenRes.body.success, true);
    assert.strictEqual(citizenRes.body.data.case_number, 'DLAO-SYL-2026-0048');
    assert.ok(citizenRes.body.data.current_status_plain);
    assert.ok(citizenRes.body.data.simulation_notice.includes('simulated for prototype'));

    // Privacy boundary: ensure NO sensitive internal logs or lawyer personal contact leaked
    assert.strictEqual(citizenRes.body.data.audit_trail, undefined);
    assert.strictEqual(citizenRes.body.data.assigned_lawyer_phone, undefined);
    assert.strictEqual(citizenRes.body.data.evidence_vault, undefined);
  });

  // ==========================================================================
  // SECTION 6: ROLE BOUNDARIES ACROSS ALL 9 ROLES (B1-B7, C1, C2)
  // ==========================================================================
  it('6. Cross-Role Boundary Audit: B5 Panel Lawyer restricted to assigned cases', async () => {
    // Unassigned case: Nuching Marma (CASE-20260912-0004) has NO panel lawyer assigned
    const unassignedRes = await request(app)
      .get('/api/cases/CASE-20260912-0004')
      .set('x-user-role', 'B5_PANEL_LAWYER')
      .set('x-user-id', 'PER-LAWYER-B5');

    assert.strictEqual(unassignedRes.status, 403);
    assert.ok(unassignedRes.body.message.includes('only authorized to access assigned cases'));

    // Assigned case: Abdul Malek (CASE-20260220-0005) IS assigned to PER-LAWYER-B5
    const assignedRes = await request(app)
      .get('/api/cases/CASE-20260220-0005')
      .set('x-user-role', 'B5_PANEL_LAWYER')
      .set('x-user-id', 'PER-LAWYER-B5');

    assert.strictEqual(assignedRes.status, 200);
    assert.strictEqual(assignedRes.body.data.id, 'CASE-20260220-0005');
  });

  it('7. Cross-Role Boundary Audit: B6 Receiving DLAO can acknowledge referrals', async () => {
    const res = await request(app)
      .post('/api/cases/CASE-20260910-0003/referrals/REF-002/acknowledge')
      .set('x-user-role', 'B6_RECEIVING_DLAO')
      .set('x-user-id', 'PER-RECEIVING-B6')
      .send({
        assigned_officer_id: 'OFFICER-B6-CONFIRM-99',
        notes: 'Receiving DLAO formal acknowledgement'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.acknowledgement_status, 'ACKNOWLEDGED');
  });

  it('8. Cross-Role Boundary Audit: B7 DLAO Admin cannot access sensitive image abuse evidence', async () => {
    const res = await request(app)
      .get('/api/cases/CASE-20260910-0003/evidence/EV-20260910-001')
      .set('x-user-role', 'B7_DLAO_ADMIN')
      .set('x-user-id', 'PER-ADMIN-B7');

    assert.strictEqual(res.status, 403);
  });

  // ==========================================================================
  // SECTION 7: IMMUTABLE AUDIT TRAIL PROTECTION
  // ==========================================================================
  it('9. Immutable audit trail SQLite triggers reject UPDATE and DELETE attempts', () => {
    const db = getDb(testDbPath);

    // Direct SQL update attempt
    assert.throws(() => {
      db.prepare("UPDATE audit_log SET notes = 'tampered' WHERE id = 'AUD-001'").run();
    }, /IMMUTABLE_VIOLATION/);

    // Direct SQL delete attempt
    assert.throws(() => {
      db.prepare("DELETE FROM audit_log WHERE id = 'AUD-001'").run();
    }, /IMMUTABLE_VIOLATION/);
  });

  // ==========================================================================
  // SECTION 8: ACCESS DENIED AUDIT RECORDING
  // ==========================================================================
  it('10. Unauthorized attempts write ACCESS_DENIED entries to immutable audit log', async () => {
    // Generate unauthorized attempt
    await request(app)
      .post('/api/cases/CASE-20260901-0001/tasks')
      .set('x-user-role', 'CITIZEN_APPLICANT')
      .set('x-user-id', 'PER-CITIZEN-MOYURI')
      .send({ title: 'Illegal Task Creation' });

    // Verify audit log has ACCESS_DENIED
    const auditRes = await request(app)
      .get('/api/cases/CASE-20260901-0001/events')
      .set('x-user-role', 'B1_DLAO_OFFICER');

    const accessDeniedEvents = auditRes.body.data.filter(e => e.action === AUDIT_ACTIONS.ACCESS_DENIED);
    assert.ok(accessDeniedEvents.length >= 1);
  });
});
