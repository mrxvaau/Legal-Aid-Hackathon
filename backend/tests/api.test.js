const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Set test environment database
const testDbPath = path.resolve(__dirname, '../data/test.sqlite');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { seed } = require('../src/db/seed');
const { getDb } = require('../src/db/connection');

describe('ADLASB Core API & Domain Model Tests', () => {
  let createdAppId = null;
  let createdCaseId = null;
  let createdPersonId = null;

  before(() => {
    // Seed test database
    seed(getDb(testDbPath));
  });

  it('1. GET /api/health should return system status UP', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'UP');
    assert.strictEqual(res.body.service, 'ADLASB Digital Legal Aid System API');
  });

  it('2. GET /api/meta should return 7 provider roles and 11 shared case states', async () => {
    const res = await request(app).get('/api/meta');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.roles);
    assert.ok(res.body.case_states);

    // Verify 7 mandatory provider roles + citizen roles
    const requiredRoles = [
      'B1_DLAO_OFFICER',
      'B2_LEGAL_AID_OFFICER',
      'B3_HELPLINE_AGENT',
      'B4_UDC_ENTREPRENEUR',
      'B5_PANEL_LAWYER',
      'B6_RECEIVING_DLAO',
      'B7_DLAO_ADMIN'
    ];
    for (const r of requiredRoles) {
      assert.ok(res.body.roles[r], `Missing role: ${r}`);
    }

    // Verify 11 shared case states
    const requiredStates = [
      'NEW', 'INTAKE', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS',
      'REFERRED', 'MEDIATION', 'SETTLEMENT_DRAFT', 'WAITING_FOR_ACTION',
      'RESOLVED', 'CLOSED'
    ];
    for (const s of requiredStates) {
      assert.ok(res.body.case_states[s], `Missing state: ${s}`);
    }
  });

  it('3. POST /api/applications should create an application and applicant person', async () => {
    const payload = {
      applicant: {
        full_name: 'Fatema Begum',
        full_name_bn: 'ফাতেমা বেগম',
        gender: 'FEMALE',
        phone: '01719999001',
        district: 'Dhaka',
        division: 'Dhaka',
        socio_economic_profile: { income: 8000 }
      },
      category: 'FAMILY_DISPUTE',
      intake_channel: 'DLAO_WALKIN',
      intake_office: 'DLAO Dhaka',
      summary: 'Dower and maintenance claim following abandonment',
      summary_bn: 'স্বামী কর্তৃক পরিত্যাগের পর মোহরানা ও খোরপোশ আদায়ের দাবি'
    };

    const res = await request(app)
      .post('/api/applications')
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.id.startsWith('APP-'));
    assert.strictEqual(res.body.data.applicant_name, 'Fatema Begum');
    createdAppId = res.body.data.id;
    createdPersonId = res.body.data.applicant_id;
  });

  it('4. GET /api/applications/:id should retrieve the created application with audit', async () => {
    const res = await request(app)
      .get(`/api/applications/${createdAppId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.id, createdAppId);
    assert.strictEqual(res.body.data.category, 'FAMILY_DISPUTE');
  });

  it('5. POST /api/cases should create a case linked to Application ID and auto-link applicant', async () => {
    const payload = {
      application_id: createdAppId,
      title: 'Fatema Begum vs Kamal Hossain - Dower Claim',
      title_bn: 'ফাতেমা বেগম বনাম কামাল হোসেন - মোহরানা মামলা',
      priority: 'HIGH',
      intake_office: 'DLAO Dhaka'
    };

    const res = await request(app)
      .post('/api/cases')
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.id.startsWith('CASE-'));
    assert.strictEqual(res.body.data.application_id, createdAppId);
    assert.strictEqual(res.body.data.status, 'NEW');
    createdCaseId = res.body.data.id;
  });

  it('6. POST /api/cases/:id/people should link authorized representative with explicit relationship', async () => {
    const payload = {
      person: {
        full_name: 'Anisur Rahman',
        full_name_bn: 'আনিসুর রহমান',
        gender: 'MALE',
        phone: '01719999002',
        district: 'Dhaka',
        division: 'Dhaka'
      },
      role_in_case: 'AUTHORIZED_REPRESENTATIVE',
      relationship_to_applicant: 'UNCLE',
      authorization_doc_ref: 'DLAO-REP-AUTH-2026-DH-105',
      is_primary_contact: true,
      notes: 'Maternal uncle holding power of representation form'
    };

    const res = await request(app)
      .post(`/api/cases/${createdCaseId}/people`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.role_in_case, 'AUTHORIZED_REPRESENTATIVE');
    assert.strictEqual(res.body.data.relationship_to_applicant, 'UNCLE');
    assert.strictEqual(res.body.data.authorization_doc_ref, 'DLAO-REP-AUTH-2026-DH-105');
  });

  it('7. POST /api/cases/:id/events should record state changes and audit events', async () => {
    const payload = {
      action: 'HEARING_NOTICE_SERVED',
      notes: 'Notice served via courier to opposing party',
      payload_after: { notice_tracking_no: 'SA-9902' }
    };

    const res = await request(app)
      .post(`/api/cases/${createdCaseId}/events`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.action, 'HEARING_NOTICE_SERVED');
  });

  it('8. POST /api/cases/:id/tasks should create a trackable task', async () => {
    const payload = {
      title: 'Obtain Marriage Certificate (Nikahnama)',
      title_bn: 'বিবাহের কাবিননামা সংগ্রহ',
      description: 'Liaise with Kazi Office to secure certified nikahnama',
      assigned_to_role: 'B7_DLAO_ADMIN',
      due_date: '2026-10-15',
      priority: 'HIGH'
    };

    const res = await request(app)
      .post(`/api/cases/${createdCaseId}/tasks`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.id.startsWith('TSK-'));
    assert.strictEqual(res.body.data.status, 'PENDING');
  });

  it('9. POST /api/cases/:id/referrals should create a referral and update case status to REFERRED', async () => {
    const payload = {
      referral_type: 'DLAO_TO_DLAO',
      referring_office: 'DLAO Dhaka',
      receiving_office: 'DLAO Gazipur',
      referring_role: 'B1_DLAO_OFFICER',
      reason: 'Opposing party resides in Gazipur jurisdiction; cross-district service required'
    };

    const res = await request(app)
      .post(`/api/cases/${createdCaseId}/referrals`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.id.startsWith('REF-'));

    // Verify case state updated to REFERRED
    const caseRes = await request(app)
      .get(`/api/cases/${createdCaseId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER');
    assert.strictEqual(caseRes.body.data.status, 'REFERRED');
  });

  it('10. POST /api/cases/:id/incidents should link an incident report with Thana GD/FIR', async () => {
    const payload = {
      incident_type: 'THREAT_OF_VIOLENCE',
      incident_date: '2026-09-20',
      location: 'Mohammadpur, Dhaka',
      description: 'Threats delivered at applicant residence demanding withdrawal of dower claim',
      severity: 'HIGH',
      police_station_jurisdiction: 'Mohammadpur Thana',
      gd_or_fir_number: 'GD-1249/2026'
    };

    const res = await request(app)
      .post(`/api/cases/${createdCaseId}/incidents`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.id.startsWith('INC-'));
    assert.strictEqual(res.body.data.gd_or_fir_number, 'GD-1249/2026');
  });

  it('11. POST /api/cases/:id/provenance should record AI-assisted provenance and allow human confirmation', async () => {
    const payload = {
      field_name: 'means_test_recommendation',
      source_type: 'ai_assisted',
      source_language: 'bn',
      target_language: 'en',
      source_details: { model: 'ADLASB-RulesEngine-v1', score: 98 },
      raw_content: 'Applicant qualifies under statutory threshold: household income < 15k BDT.',
      processed_content: 'Eligible for 100% subsidized legal representation.'
    };

    const res = await request(app)
      .post(`/api/cases/${createdCaseId}/provenance`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.source_type, 'ai_assisted');
    assert.strictEqual(res.body.data.confirmed_by, null);
    const provId = res.body.data.id;

    // Confirm by human officer
    const confirmRes = await request(app)
      .post(`/api/cases/${createdCaseId}/provenance/${provId}/confirm`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1')
      .send();

    assert.strictEqual(confirmRes.status, 200);
    assert.strictEqual(confirmRes.body.data.confirmed_by, 'PER-OFFICER-B1');
    assert.ok(confirmRes.body.data.confirmed_at);
  });

  it('12. GET /api/cases/:id should retrieve a complete integrated case with all associations', async () => {
    const res = await request(app)
      .get(`/api/cases/${createdCaseId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(res.status, 200);
    const c = res.body.data;

    // Verify trace back to Application ID
    assert.strictEqual(c.application_id, createdAppId);
    assert.ok(c.case_number);

    // Verify people (both applicant and representative)
    assert.ok(Array.isArray(c.people));
    assert.ok(c.people.length >= 2);
    const rep = c.people.find(p => p.role_in_case === 'AUTHORIZED_REPRESENTATIVE');
    assert.ok(rep, 'Authorized representative must be linked to case');
    assert.strictEqual(rep.relationship_to_applicant, 'UNCLE');

    // Verify tasks
    assert.ok(Array.isArray(c.tasks));
    assert.ok(c.tasks.length >= 1);

    // Verify referrals
    assert.ok(Array.isArray(c.referrals));
    assert.ok(c.referrals.length >= 1);

    // Verify incidents
    assert.ok(Array.isArray(c.incidents));
    assert.ok(c.incidents.length >= 1);

    // Verify provenance log
    assert.ok(Array.isArray(c.provenance));
    assert.ok(c.provenance.length >= 1);

    // Verify audit trail
    assert.ok(Array.isArray(c.audit_trail));
    assert.ok(c.audit_trail.length >= 1);
  });

  it('13. Seed Data Verification: Verify the corrected 5 mandatory citizen scenarios', async () => {
    // 1. Moyuri Akter & Ripon (Safe Contact & Representative & Secondhand Reporting)
    const case1Res = await request(app)
      .get('/api/cases/CASE-20260901-0001')
      .set('x-user-role', 'B1_DLAO_OFFICER');
    assert.strictEqual(case1Res.status, 200);
    const people1 = case1Res.body.data.people;
    const moyuri = people1.find(p => p.person_id === 'PER-CITIZEN-MOYURI');
    const ripon = people1.find(p => p.person_id === 'PER-CITIZEN-RIPON');
    assert.ok(moyuri && ripon, 'Moyuri and Ripon must both be linked to case without merging identities');
    assert.strictEqual(ripon.role_in_case, 'AUTHORIZED_REPRESENTATIVE');
    assert.strictEqual(ripon.relationship_to_applicant, 'BROTHER');
    assert.strictEqual(ripon.authorization_doc_ref, 'DLAO-REP-AUTH-2026-DH-091');

    // Verify safe contact details for Moyuri
    assert.ok(case1Res.body.data.safe_contacts.length >= 1, 'Moyuri must have safe contact configuration');
    const sc = case1Res.body.data.safe_contacts[0];
    assert.strictEqual(sc.is_safe_contact_active, 1);
    assert.strictEqual(sc.danger_level, 'HIGH');
    assert.ok(sc.restriction_reason.includes('husband controls phone'));

    // Verify secondhand reporting in provenance
    const secondhandProv = case1Res.body.data.provenance.find(p => p.is_secondhand_report === 1);
    assert.ok(secondhandProv, 'Case 1 must have secondhand reporting provenance');
    assert.strictEqual(secondhandProv.reported_for_person_id, 'PER-CITIZEN-MOYURI');

    // 2. Ripon (Accessible non-visual interaction metadata)
    assert.strictEqual(ripon.socio_economic_profile.accessibility.interaction_mode, 'NON_VISUAL_VOICE_FIRST');
    assert.strictEqual(ripon.socio_economic_profile.accessibility.no_captcha_required, true);
    assert.strictEqual(ripon.socio_economic_profile.accessibility.no_visual_otp_required, true);

    // 3. Nabila (Image-based cyber harassment, sensitive evidence, urgent PCSW referral)
    const case3Res = await request(app)
      .get('/api/cases/CASE-20260910-0003')
      .set('x-user-role', 'B1_DLAO_OFFICER');
    assert.strictEqual(case3Res.status, 200);
    assert.ok(case3Res.body.data.incidents.length >= 1);
    const cyberInc = case3Res.body.data.incidents[0];
    assert.strictEqual(cyberInc.is_sensitive_evidence, 1);
    assert.strictEqual(cyberInc.evidence_privacy_level, 'STRICTLY_RESTRICTED_IMAGE_ABUSE');
    
    // Verify referral to Police Cyber Support for Women with ownership and acknowledgement
    assert.ok(case3Res.body.data.referrals.length >= 1);
    const cyberRef = case3Res.body.data.referrals[0];
    assert.strictEqual(cyberRef.referral_type, 'CYBER_CRIME_DIVISION');
    assert.strictEqual(cyberRef.acknowledgement_status, 'ACKNOWLEDGED');
    assert.strictEqual(cyberRef.assigned_officer_id, 'OFFICER-CID-CYBER-88');

    // 4. Nuching Marma (Indigenous CHT, 5-tier distinct provenance without collapsing)
    const case4Res = await request(app)
      .get('/api/cases/CASE-20260912-0004')
      .set('x-user-role', 'B1_DLAO_OFFICER');
    assert.strictEqual(case4Res.status, 200);
    const provs = case4Res.body.data.provenance;
    const spoken = provs.find(p => p.source_type === 'spoken_by_person');
    const translated = provs.find(p => p.source_type === 'translated');
    const typed = provs.find(p => p.source_type === 'typed_by_staff');
    const ai = provs.find(p => p.source_type === 'ai_assisted');
    const confirmed = provs.find(p => p.source_type === 'confirmed_by_human');
    assert.ok(spoken, 'Must record spoken_by_person');
    assert.ok(translated, 'Must record translated text');
    assert.ok(typed, 'Must record typed_by_staff');
    assert.ok(ai, 'Must record ai_assisted analysis');
    assert.ok(confirmed, 'Must record human officer confirmation');
    assert.notStrictEqual(spoken.raw_content, translated.processed_content, 'Spoken and translated must not collapse into one field');

    // 5. Abdul Malek (7-month-old case, lawyer silent >90 days, non-smartphone inquiry code)
    const case5Res = await request(app)
      .get('/api/cases/CASE-20260220-0005')
      .set('x-user-role', 'B1_DLAO_OFFICER');
    assert.strictEqual(case5Res.status, 200);
    assert.strictEqual(case5Res.body.data.assigned_lawyer_id, 'PER-LAWYER-B5');
    assert.strictEqual(case5Res.body.data.lawyer_status, 'SILENT_UNRESPONSIVE');
    assert.strictEqual(case5Res.body.data.deadline_alert_level, 'CRITICAL_OVERDUE');
    assert.strictEqual(case5Res.body.data.citizen_inquiry_code, '16699-MALEK-7492');
  });

  it('14. Safe Contact Privacy Masking: Unauthorized role sees redacted contact info', async () => {
    // Helpline agent cannot view unrestricted safe contact details
    const res = await request(app)
      .get('/api/cases/CASE-20260901-0001/safe-contact')
      .set('x-user-role', 'B3_HELPLINE_AGENT')
      .set('x-user-id', 'PER-HELPLINE-B3');

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    const maskedContact = res.body.data[0];
    assert.strictEqual(maskedContact.is_masked, true);
    assert.strictEqual(maskedContact.safe_channel_details, '[REDACTED: RESTRICTED CONTACT PROTOCOL ACTIVE]');
    assert.ok(maskedContact.confidentiality_notice.includes('ACCESS RESTRICTED'));
  });
});
