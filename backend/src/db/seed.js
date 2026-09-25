const { getDb } = require('./connection');
const { migrate } = require('./migrate');
const { ROLES, CASE_STATES, PROVENANCE_SOURCES, AUDIT_ACTIONS } = require('../utils/constants');

function seed(dbInstance = null) {
  const db = dbInstance || getDb();
  migrate(db);

  // Clear existing scenario data for clean idempotent seeding
  const clearTx = db.transaction(() => {
    db.prepare('DELETE FROM incident_links').run();
    db.prepare('DELETE FROM referrals').run();
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM audit_log').run();
    db.prepare('DELETE FROM provenance_log').run();
    db.prepare('DELETE FROM case_people').run();
    db.prepare('DELETE FROM cases').run();
    db.prepare('DELETE FROM applications').run();
    db.prepare('DELETE FROM people').run();
    db.prepare('DELETE FROM user_roles').run();
  });
  clearTx();

  const seedTx = db.transaction(() => {
    // ------------------------------------------------------------------------
    // 1. SEED PROVIDERS (Staff / Officers for the 7 mandatory roles)
    // ------------------------------------------------------------------------
    const providers = [
      {
        id: 'PER-OFFICER-B1',
        national_id: 'NID-198026901111',
        full_name: 'Shamsul Huda',
        full_name_bn: 'শামসুল হুদা',
        gender: 'MALE',
        phone: '01711000001',
        email: 'dlao.dhaka@legalaid.gov.bd',
        district: 'Dhaka',
        division: 'Dhaka',
        role_id: ROLES.B1_DLAO_OFFICER,
        office: 'DLAO Dhaka'
      },
      {
        id: 'PER-MEDIATOR-B2',
        national_id: 'NID-198526902222',
        full_name: 'Rokeya Sultana',
        full_name_bn: 'রোকেয়া সুলতানা',
        gender: 'FEMALE',
        phone: '01711000002',
        email: 'lao.mediator@legalaid.gov.bd',
        district: 'Dhaka',
        division: 'Dhaka',
        role_id: ROLES.B2_LEGAL_AID_OFFICER,
        office: 'DLAO Dhaka'
      },
      {
        id: 'PER-HELPLINE-B3',
        national_id: 'NID-199226903333',
        full_name: 'Tariqul Islam',
        full_name_bn: 'তরিকুল ইসলাম',
        gender: 'MALE',
        phone: '01711000003',
        email: 'agent33@16699.gov.bd',
        district: 'Dhaka',
        division: 'Dhaka',
        role_id: ROLES.B3_HELPLINE_AGENT,
        office: 'National Helpline 16699 Central'
      },
      {
        id: 'PER-UDC-B4',
        national_id: 'NID-199426904444',
        full_name: 'Minu Akhter',
        full_name_bn: 'মিনু আক্তার',
        gender: 'FEMALE',
        phone: '01711000004',
        email: 'udc.rangamati@a2i.gov.bd',
        district: 'Rangamati',
        division: 'Chattogram',
        role_id: ROLES.B4_UDC_ENTREPRENEUR,
        office: 'Baghaichhari UDC, Rangamati'
      },
      {
        id: 'PER-LAWYER-B5',
        national_id: 'NID-198226905555',
        full_name: 'Advocate Farhana Yasmin',
        full_name_bn: 'অ্যাডভোকেট ফারহানা ইয়াসমিন',
        gender: 'FEMALE',
        phone: '01711000005',
        email: 'adv.farhana@dhakabar.org',
        district: 'Sylhet',
        division: 'Sylhet',
        role_id: ROLES.B5_PANEL_LAWYER,
        office: 'Sylhet District Bar Association'
      },
      {
        id: 'PER-RECEIVING-B6',
        national_id: 'NID-197926906666',
        full_name: 'Kazi Nasiruddin',
        full_name_bn: 'কাজী নাসিরউদ্দিন',
        gender: 'MALE',
        phone: '01711000006',
        email: 'dlao.chattogram@legalaid.gov.bd',
        district: 'Chattogram',
        division: 'Chattogram',
        role_id: ROLES.B6_RECEIVING_DLAO,
        office: 'DLAO Chattogram'
      },
      {
        id: 'PER-ADMIN-B7',
        national_id: 'NID-199026907777',
        full_name: 'Mahmudul Hasan',
        full_name_bn: 'মাহমুদুল হাসান',
        gender: 'MALE',
        phone: '01711000007',
        email: 'admin.support@legalaid.gov.bd',
        district: 'Dhaka',
        division: 'Dhaka',
        role_id: ROLES.B7_DLAO_ADMIN,
        office: 'DLAO Dhaka'
      }
    ];

    const insertPersonStmt = db.prepare(`
      INSERT INTO people (
        id, national_id, full_name, full_name_bn, gender, phone, email,
        address, upazila, district, division, socio_economic_profile
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertUserRoleStmt = db.prepare(`
      INSERT INTO user_roles (id, user_id, user_name, role_id, office)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const p of providers) {
      insertPersonStmt.run(
        p.id,
        p.national_id,
        p.full_name,
        p.full_name_bn,
        p.gender,
        p.phone,
        p.email,
        `${p.office} premises`,
        p.district,
        p.district,
        p.division,
        JSON.stringify({ staff: true, role_code: p.role_id })
      );

      insertUserRoleStmt.run(
        `UR-${p.id}`,
        p.id,
        p.full_name,
        p.role_id,
        p.office
      );
    }

    // ------------------------------------------------------------------------
    // 2. SEED CITIZENS (The 5 Mandatory Citizen Scenarios)
    // ------------------------------------------------------------------------

    // Scenario 1 & 2: Moyuri Akter (Applicant) & Ripon (Authorized Representative)
    insertPersonStmt.run(
      'PER-CITIZEN-MOYURI',
      'NID-199856100101',
      'Moyuri Akter',
      'ময়ূরী আক্তার',
      'FEMALE',
      '01822000101',
      'moyuri.akter@example.com',
      'House 14, Ward 4, Mirpur',
      'Mirpur',
      'Dhaka',
      'Dhaka',
      JSON.stringify({
        income_bracket: 'BELOW_15000',
        vulnerability: 'DOMESTIC_VIOLENCE_SURVIVOR',
        occupation: 'Homemaker'
      })
    );

    insertPersonStmt.run(
      'PER-CITIZEN-RIPON',
      'NID-199656100102',
      'Ripon',
      'রিপন',
      'MALE',
      '01822000102',
      'ripon.rep@example.com',
      'House 14, Ward 4, Mirpur',
      'Mirpur',
      'Dhaka',
      'Dhaka',
      JSON.stringify({
        relationship: 'BROTHER',
        is_representative: true,
        occupation: 'Shop Assistant'
      })
    );

    // Opposing party for Moyuri case
    insertPersonStmt.run(
      'PER-OPP-FARUK',
      'NID-199256100103',
      'Faruk Hossain',
      'ফারুক হোসেন',
      'MALE',
      '01822000103',
      null,
      'Mirpur 2, Dhaka',
      'Mirpur',
      'Dhaka',
      'Dhaka',
      JSON.stringify({ role: 'RESPONDENT_HUSBAND' })
    );

    // Scenario 3: Nabila (RMG Garment Worker)
    insertPersonStmt.run(
      'PER-CITIZEN-NABILA',
      'NID-200156100201',
      'Nabila',
      'নাবিলা',
      'FEMALE',
      '01933000201',
      null,
      'Boro Bari, Gazipur Sadar',
      'Gazipur Sadar',
      'Gazipur',
      'Dhaka',
      JSON.stringify({
        income_bracket: 'BELOW_12000',
        vulnerability: 'RMG_WORKER_WAGE_DEPRIVATION',
        occupation: 'Sewing Operator'
      })
    );

    // Scenario 4: Nuching Marma (Indigenous Citizen - CHT)
    insertPersonStmt.run(
      'PER-CITIZEN-NUCHING',
      'NID-199556100301',
      'Nuching Marma',
      'নুচিং মারমা',
      'FEMALE',
      '01555000301',
      null,
      'Dighinala Para, Baghaichhari',
      'Baghaichhari',
      'Rangamati',
      'Chattogram',
      JSON.stringify({
        income_bracket: 'EXTREME_POVERTY',
        vulnerability: 'INDIGENOUS_COMMUNITY_CHT',
        primary_language: 'Marma',
        occupation: 'Farmer'
      })
    );

    // Scenario 5: Abdul Malek (Elderly Land Disputant - 5+ yr long-running case)
    insertPersonStmt.run(
      'PER-CITIZEN-MALEK',
      'NID-195256100401',
      'Abdul Malek',
      'আব্দুল মালেক',
      'MALE',
      '01744000401',
      null,
      'Gram: Radhanagar, Beanibazar',
      'Beanibazar',
      'Sylhet',
      'Sylhet',
      JSON.stringify({
        age: 74,
        income_bracket: 'BELOW_10000',
        vulnerability: 'ELDERLY_MARGINAL_FARMER',
        occupation: 'Retired / Smallholder Farmer'
      })
    );

    // ------------------------------------------------------------------------
    // 3. APPLICATIONS, CASES, CASE_PEOPLE, TASKS, REFERRALS, INCIDENTS, PROVENANCE, AUDIT
    // ------------------------------------------------------------------------
    const insertAppStmt = db.prepare(`
      INSERT INTO applications (
        id, applicant_id, representative_id, category, intake_channel,
        intake_office, status, summary, summary_bn, details_json,
        created_by_role, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCaseStmt = db.prepare(`
      INSERT INTO cases (
        id, application_id, case_number, title, title_bn, category,
        status, priority, intake_office, court_name,
        assigned_officer_id, assigned_lawyer_id, details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCasePersonStmt = db.prepare(`
      INSERT INTO case_people (
        id, case_id, person_id, role_in_case, relationship_to_applicant,
        authorization_doc_ref, is_primary_contact, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTaskStmt = db.prepare(`
      INSERT INTO tasks (
        id, case_id, title, title_bn, description, assigned_to_role,
        assigned_to_user_id, due_date, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertReferralStmt = db.prepare(`
      INSERT INTO referrals (
        id, case_id, referral_type, referring_office, receiving_office,
        referring_role, receiving_role, status, reason, reason_bn, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertIncidentStmt = db.prepare(`
      INSERT INTO incident_links (
        id, case_id, incident_type, incident_date, location,
        description, description_bn, severity, police_station_jurisdiction,
        gd_or_fir_number, linked_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertProvStmt = db.prepare(`
      INSERT INTO provenance_log (
        id, case_id, application_id, entity_type, entity_id, field_name,
        source_type, source_language, target_language, author_id, author_role,
        source_details, raw_content, processed_content, confirmed_by, confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAuditStmt = db.prepare(`
      INSERT INTO audit_log (
        id, case_id, application_id, action, actor_id, actor_role,
        payload_before, payload_after, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // ========================================================================
    // SCENARIO 1 & 2: MOYURI AKTER & RIPON
    // ========================================================================
    const app1Id = 'APP-20260901-0001';
    const case1Id = 'CASE-20260901-0001';

    insertAppStmt.run(
      app1Id,
      'PER-CITIZEN-MOYURI',
      'PER-CITIZEN-RIPON',
      'FAMILY_DISPUTE',
      'DLAO_WALKIN',
      'DLAO Dhaka',
      'CONVERTED_TO_CASE',
      'Maintenance and domestic protection application submitted via authorized representative Ripon',
      'অনুমোদিত প্রতিনিধি রিপনের মাধ্যমে খোরপোশ ও পারিবারিক সুরক্ষা আবেদন জমা দেওয়া হয়েছে',
      JSON.stringify({
        means_test_passed: true,
        urgency: 'HIGH',
        representative_authorization_form: 'DLAO-REP-AUTH-2026-DH-091'
      }),
      ROLES.B1_DLAO_OFFICER,
      'PER-OFFICER-B1'
    );

    insertCaseStmt.run(
      case1Id,
      app1Id,
      'DLAO-DHK-2026-0042',
      'Moyuri Akter vs Faruk Hossain - Maintenance & Protection',
      'ময়ূরী আক্তার বনাম ফারুক হোসেন - খোরপোশ ও পারিবারিক সুরক্ষা',
      'FAMILY_DISPUTE',
      CASE_STATES.MEDIATION,
      'HIGH',
      'DLAO Dhaka',
      'Family Court Dhaka',
      'PER-OFFICER-B1',
      'PER-LAWYER-B5',
      JSON.stringify({ stage: 'ADR_MEDIATION_SCHEDULED' })
    );

    // Link Moyuri as Applicant
    insertCasePersonStmt.run(
      'CP-001',
      case1Id,
      'PER-CITIZEN-MOYURI',
      'APPLICANT',
      'SELF',
      null,
      0,
      'Applicant unable to travel easily due to security concerns'
    );

    // Link Ripon as Authorized Representative (EXPLICIT DISTINCTION - NOT MERGED)
    insertCasePersonStmt.run(
      'CP-002',
      case1Id,
      'PER-CITIZEN-RIPON',
      'AUTHORIZED_REPRESENTATIVE',
      'BROTHER',
      'DLAO-REP-AUTH-2026-DH-091',
      1,
      'Brother of applicant, holding formal representation authorization form'
    );

    // Link Respondent Faruk
    insertCasePersonStmt.run(
      'CP-003',
      case1Id,
      'PER-OPP-FARUK',
      'OPPOSING_PARTY',
      'SPOUSE',
      null,
      0,
      'Summons issued for mediation appearance'
    );

    // Tasks for Moyuri & Ripon case
    insertTaskStmt.run(
      'TSK-001',
      case1Id,
      'Mediation Session Notice Issuance',
      'সালিশি বৈঠকের নোটিশ জারি',
      'Send formal summons to Faruk Hossain for first ADR mediation hearing on October 5, 2026',
      ROLES.B2_LEGAL_AID_OFFICER,
      'PER-MEDIATOR-B2',
      '2026-10-02',
      'HIGH',
      'COMPLETED'
    );

    insertTaskStmt.run(
      'TSK-002',
      case1Id,
      'Conduct Preliminary Mediation Session',
      'প্রাথমিক সালিশি অধিবেশন পরিচালনা',
      'Convene joint session with Moyuri, authorized representative Ripon, and Faruk',
      ROLES.B2_LEGAL_AID_OFFICER,
      'PER-MEDIATOR-B2',
      '2026-10-05',
      'HIGH',
      'PENDING'
    );

    // Incident for Moyuri case
    insertIncidentStmt.run(
      'INC-001',
      case1Id,
      'DOMESTIC_VIOLENCE',
      '2026-08-28',
      'Mirpur Section 2, Dhaka',
      'Physical assault and eviction threat following dowry demand',
      'যৌতুকের দাবিতে শারীরিক নির্যাতন ও বাড়ি থেকে বের করে দেওয়ার হুমকি',
      'HIGH',
      'Mirpur Model Thana',
      'GD-884/2026',
      'PER-OFFICER-B1'
    );

    // Provenance for Moyuri: Statement submitted by authorized representative Ripon
    insertProvStmt.run(
      'PRV-001',
      case1Id,
      app1Id,
      'application',
      app1Id,
      'applicant_statement',
      PROVENANCE_SOURCES.TYPED_BY_STAFF,
      'bn',
      'bn',
      'PER-OFFICER-B1',
      ROLES.B1_DLAO_OFFICER,
      JSON.stringify({ medium: 'IN_PERSON_REPRESENTATIVE_INTERVIEW', representative: 'Ripon' }),
      'আবেদনকারী শারীরিকভাবে অসুস্থ থাকায় তার ভাই রিপন প্রতিনিধিত্ব করছেন।',
      'Statement recorded from authorized representative Ripon on behalf of Moyuri Akter.',
      'PER-OFFICER-B1',
      '2026-09-01T10:30:00Z'
    );

    // Audit entries
    insertAuditStmt.run(
      'AUD-001',
      case1Id,
      app1Id,
      AUDIT_ACTIONS.APPLICATION_CREATED,
      'PER-OFFICER-B1',
      ROLES.B1_DLAO_OFFICER,
      null,
      JSON.stringify({ status: 'SUBMITTED', applicant: 'Moyuri Akter', rep: 'Ripon' }),
      'Application intake recorded by DLAO Officer'
    );

    insertAuditStmt.run(
      'AUD-002',
      case1Id,
      app1Id,
      AUDIT_ACTIONS.CASE_CREATED,
      'PER-OFFICER-B1',
      ROLES.B1_DLAO_OFFICER,
      null,
      JSON.stringify({ case_number: 'DLAO-DHK-2026-0042', status: 'NEW' }),
      'Converted application into formal legal aid case'
    );

    insertAuditStmt.run(
      'AUD-003',
      case1Id,
      app1Id,
      AUDIT_ACTIONS.REPRESENTATIVE_LINKED,
      'PER-OFFICER-B1',
      ROLES.B1_DLAO_OFFICER,
      null,
      JSON.stringify({ representative: 'Ripon', relation: 'BROTHER', auth_doc: 'DLAO-REP-AUTH-2026-DH-091' }),
      'Verified and registered brother Ripon as authorized representative'
    );

    // ========================================================================
    // SCENARIO 3: NABILA (Garment Worker, Helpline 16699, Multi-Incidents)
    // ========================================================================
    const app3Id = 'APP-20260910-0003';
    const case3Id = 'CASE-20260910-0003';

    insertAppStmt.run(
      app3Id,
      'PER-CITIZEN-NABILA',
      null,
      'LABOUR_DISPUTE',
      'HELPLINE_16699',
      'National Helpline 16699 Central',
      'CONVERTED_TO_CASE',
      'Withholding of 4 months earned wages, illegal termination, and supervisor harassment at export garment factory',
      '৪ মাসের বকেয়া বেতন পরিশোধ না করে বেআইনি বরখাস্ত এবং সুপারভাইজার কর্তৃক হয়রানি',
      JSON.stringify({
        factory_name: 'Apex Horizon Apparels Ltd.',
        total_arrears_bdt: 48000,
        intake_call_id: 'CALL-16699-2026-9982'
      }),
      ROLES.B3_HELPLINE_AGENT,
      'PER-HELPLINE-B3'
    );

    insertCaseStmt.run(
      case3Id,
      app3Id,
      'DLAO-GZP-2026-0189',
      'Nabila vs Apex Horizon Apparels - Wage Recovery & Labor Rights',
      'নাবিলা বনাম এপেক্স হরাইজন অ্যাপারেলস - বকেয়া মজুরি আদায়',
      'LABOUR_DISPUTE',
      CASE_STATES.IN_PROGRESS,
      'HIGH',
      'DLAO Dhaka',
      'Labour Court 2 Dhaka',
      'PER-OFFICER-B1',
      'PER-LAWYER-B5',
      JSON.stringify({ legal_act: 'Bangladesh Labour Act 2006 (Section 33)' })
    );

    insertCasePersonStmt.run(
      'CP-004',
      case3Id,
      'PER-CITIZEN-NABILA',
      'APPLICANT',
      'SELF',
      null,
      1,
      'Primary applicant and affected garment operator'
    );

    insertCasePersonStmt.run(
      'CP-005',
      case3Id,
      'PER-LAWYER-B5',
      'PANEL_LAWYER',
      'LEGAL_COUNSEL',
      null,
      0,
      'Assigned panel lawyer representing Nabila in Labour Court'
    );

    // Multi-incidents for Nabila
    insertIncidentStmt.run(
      'INC-002',
      case3Id,
      'WAGE_THEFT',
      '2026-08-31',
      'Apex Horizon Factory, Gazipur',
      'Sudden verbal termination without notice pay or clearance of 4 months salary arrears',
      'নোটিশ প্রদান ছাড়াই হঠাৎ মৌখিক বরখাস্ত এবং ৪ মাসের বকেয়া বেতন আটকে রাখা',
      'HIGH',
      'Gazipur Sadar Thana',
      null,
      'PER-HELPLINE-B3'
    );

    insertIncidentStmt.run(
      'INC-003',
      case3Id,
      'HARASSMENT',
      '2026-09-02',
      'Gazipur Chowrasta',
      'Threatening telephone calls from factory security contractor demanding surrender of timecard',
      'টাইমকার্ড জমা দেওয়ার জন্য কারখানা নিরাপত্তা কন্ট্রাক্টরের পক্ষ থেকে ফোনে হুমকি',
      'MEDIUM',
      'Gazipur Sadar Thana',
      'GD-442/2026',
      'PER-HELPLINE-B3'
    );

    // Provenance for Nabila: Spoken telephonically via 16699 Helpline
    insertProvStmt.run(
      'PRV-002',
      case3Id,
      app3Id,
      'application',
      app3Id,
      'call_narrative',
      PROVENANCE_SOURCES.SPOKEN_BY_PERSON,
      'bn',
      'bn',
      'PER-HELPLINE-B3',
      ROLES.B3_HELPLINE_AGENT,
      JSON.stringify({ channel: 'TELEPHONY_16699', audio_recording_id: 'REC-16699-9982' }),
      'নাগরিক সরাসরি ১৬৬৯৯ নম্বরে ফোন করে তার বকেয়া বেতন ও হুমকির বিষয়ে বিস্তারিত বর্ণনা দিয়েছেন।',
      'Oral grievance recorded live by helpline agent Tariqul Islam.',
      'PER-HELPLINE-B3',
      '2026-09-10T14:15:00Z'
    );

    // Task for Nabila case
    insertTaskStmt.run(
      'TSK-003',
      case3Id,
      'Draft Section 33 Grievance Petition',
      'শ্রম আইনের ৩৩ ধারা অনুযায়ী অভিযোগ খসড়া প্রস্তুত',
      'Draft statutory grievance letter to employer under Section 33 of Bangladesh Labour Act',
      ROLES.B5_PANEL_LAWYER,
      'PER-LAWYER-B5',
      '2026-09-28',
      'HIGH',
      'IN_PROGRESS'
    );

    // ========================================================================
    // SCENARIO 4: NUCHING MARMA (Indigenous Citizen, UDC Intake, Translation Provenance)
    // ========================================================================
    const app4Id = 'APP-20260912-0004';
    const case4Id = 'CASE-20260912-0004';

    insertAppStmt.run(
      app4Id,
      'PER-CITIZEN-NUCHING',
      null,
      'INDIGENOUS_RIGHTS',
      'UDC_PORTAL',
      'DLAO Rangamati',
      'CONVERTED_TO_CASE',
      'Attempted dispossession of traditional ancestral hillside agricultural plot in Baghaichhari',
      'বাঘাইছড়িতে ঐতিহ্যগত পাহাড়ি জুম ও কৃষি জমি থেকে অন্যায়ভাবে উচ্ছেদের অপচেষ্টা',
      JSON.stringify({
        ancestral_holding_years: 40,
        village_headman_cert: 'HEADMAN-CERT-BG-41',
        intake_mode: 'UDC_ASSISTED'
      }),
      ROLES.B4_UDC_ENTREPRENEUR,
      'PER-UDC-B4'
    );

    insertCaseStmt.run(
      case4Id,
      app4Id,
      'DLAO-RNG-2026-0014',
      'Nuching Marma - Ancestral Land Dispossession Injunction',
      'নুচিং মারমা - ঐতিহ্যগত পাহাড়ি জমি রক্ষা সংক্রান্ত আবেদন',
      'INDIGENOUS_RIGHTS',
      CASE_STATES.UNDER_REVIEW,
      'URGENT',
      'DLAO Rangamati',
      'Joint District Judge Court Rangamati',
      'PER-RECEIVING-B6',
      null,
      JSON.stringify({ special_statute: 'Chittagong Hill Tracts Regulation 1900' })
    );

    insertCasePersonStmt.run(
      'CP-006',
      case4Id,
      'PER-CITIZEN-NUCHING',
      'APPLICANT',
      'SELF',
      null,
      1,
      'Indigenous applicant speaking Marma; assisted by UDC Entrepreneur'
    );

    // PROVENANCE PIPELINE FOR NUCHING MARMA:
    // 1. Spoken by person in Marma
    insertProvStmt.run(
      'PRV-003',
      case4Id,
      app4Id,
      'application',
      app4Id,
      'oral_statement',
      PROVENANCE_SOURCES.SPOKEN_BY_PERSON,
      'marma',
      'marma',
      'PER-CITIZEN-NUCHING',
      ROLES.CITIZEN_APPLICANT,
      JSON.stringify({ audio_snippet: 'UDC-AUDIO-RNG-04' }),
      'আবেদনকারী মারমা ভাষায় তার পৈতৃক জমি দখলের বিবরণ দিয়েছেন।',
      'Original oral narrative spoken by Nuching Marma in Marma language at Baghaichhari UDC.',
      null,
      null
    );

    // 2. Translated by UDC Entrepreneur (Marma -> Bangla)
    insertProvStmt.run(
      'PRV-004',
      case4Id,
      app4Id,
      'application',
      app4Id,
      'translated_statement',
      PROVENANCE_SOURCES.TRANSLATED,
      'marma',
      'bn',
      'PER-UDC-B4',
      ROLES.B4_UDC_ENTREPRENEUR,
      JSON.stringify({ translator: 'Minu Akhter (UDC)', certified: true }),
      'মারমা ভাষা থেকে বাংলায় অনুবাদ: গত তিন প্রজন্ম ধরে চাষাবাদ করা পাহাড়ি জমি থেকে উচ্ছেদের হুমকি দেওয়া হচ্ছে।',
      'Translation from Marma to Bangla: Threats of eviction from hill agricultural plot farmed across three generations.',
      null,
      null
    );

    // 3. AI-Assisted Classification & Means Test Pre-check
    insertProvStmt.run(
      'PRV-005',
      case4Id,
      app4Id,
      'case',
      case4Id,
      'legal_category_recommendation',
      PROVENANCE_SOURCES.AI_ASSISTED,
      'bn',
      'en',
      'SYSTEM_AI_ASSISTANT',
      'SYSTEM',
      JSON.stringify({ model: 'ADLASB-LegalLLM-v1', confidence: 0.94, disclaimer: 'Non-binding pre-assessment' }),
      'AI প্রস্তাবনা: CHT রেগুলেশন ১৯০০ এবং স্পেসিফিক রিলিফ অ্যাক্ট অনুযায়ী নিষেধাজ্ঞা আবেদন উপযুক্ত।',
      'AI Recommendation: Suitable for temporary injunction under CHT Regulation 1900 and Specific Relief Act.',
      null,
      null
    );

    // 4. Confirmed by Human (DLAO Officer verifies translation & eligibility)
    insertProvStmt.run(
      'PRV-006',
      case4Id,
      app4Id,
      'case',
      case4Id,
      'legal_category_recommendation',
      PROVENANCE_SOURCES.CONFIRMED_BY_HUMAN,
      'bn',
      'bn',
      'PER-RECEIVING-B6',
      ROLES.B6_RECEIVING_DLAO,
      JSON.stringify({ verified_with_headman_record: true }),
      'ডিএলএও কর্মকর্তা হেডম্যান সনদের সাথে মিলিয়ে অনুবাদ ও তথ্য চূড়ান্তভাবে নিশ্চিত করেছেন।',
      'DLAO Officer certified translated narrative against Mouza Headman record.',
      'PER-RECEIVING-B6',
      '2026-09-13T11:00:00Z'
    );

    // Task for Nuching case
    insertTaskStmt.run(
      'TSK-004',
      case4Id,
      'Verify Mouza Headman Certificate',
      'মৌজা হেডম্যান সনদ যাচাইকরণ',
      'Liaise with Baghaichhari Circle Office to authenticate customary possession certificate',
      ROLES.B7_DLAO_ADMIN,
      'PER-ADMIN-B7',
      '2026-09-30',
      'URGENT',
      'PENDING'
    );

    // ========================================================================
    // SCENARIO 5: ABDUL MALEK (Long-running Land Dispute, Lawyer Accountability, Referral)
    // ========================================================================
    const app5Id = 'APP-20210415-0005';
    const case5Id = 'CASE-20210415-0005';

    insertAppStmt.run(
      app5Id,
      'PER-CITIZEN-MALEK',
      null,
      'LAND_PROPERTY',
      'DLAO_WALKIN',
      'DLAO Sylhet',
      'CONVERTED_TO_CASE',
      'Long-standing ancestral homestead title suit and boundary encroachment pending for over 5 years',
      '৫ বছরের অধিক সময় ধরে চলমান পৈতৃক ভিটা জমি সংক্রান্ত স্বত্ব মামলা ও সীমানা জবরদখল',
      JSON.stringify({
        initial_filing_year: 2021,
        khatian_number: 'RS-4091',
        total_hearings_to_date: 18
      }),
      ROLES.B1_DLAO_OFFICER,
      'PER-OFFICER-B1'
    );

    insertCaseStmt.run(
      case5Id,
      app5Id,
      'DLAO-SYL-2021-0007',
      'Abdul Malek vs Rashid Ahmed - Title Suit No. 112/2021',
      'আব্দুল মালেক বনাম রশিদ আহমদ - স্বত্ব মামলা নং ১১২/২০২১',
      'LAND_PROPERTY',
      CASE_STATES.REFERRED,
      'HIGH',
      'DLAO Sylhet',
      'Senior Assistant Judge Court Beanibazar, Sylhet',
      'PER-OFFICER-B1',
      'PER-LAWYER-B5',
      JSON.stringify({
        court_case_no: 'Title Suit 112/2021',
        years_pending: 5,
        panel_lawyer_accountability_tracked: true
      })
    );

    insertCasePersonStmt.run(
      'CP-007',
      case5Id,
      'PER-CITIZEN-MALEK',
      'APPLICANT',
      'SELF',
      null,
      1,
      'Elderly farmer; case in progress since 2021'
    );

    // Assign Panel Lawyer Farhana Yasmin with accountability
    insertCasePersonStmt.run(
      'CP-008',
      case5Id,
      'PER-LAWYER-B5',
      'PANEL_LAWYER',
      'LEGAL_COUNSEL',
      'BAR-SYL-1982-205',
      0,
      'Assigned panel lawyer responsible for filing written arguments and monthly hearing attendance updates'
    );

    // Referral for Abdul Malek (Cross-District records verification / transferred proceedings to DLAO Chattogram)
    insertReferralStmt.run(
      'REF-001',
      case5Id,
      'DLAO_TO_DLAO',
      'DLAO Sylhet',
      'DLAO Chattogram',
      ROLES.B1_DLAO_OFFICER,
      ROLES.B6_RECEIVING_DLAO,
      'ACCEPTED',
      'Original registered deeds located at Chattogram Divisional Record Room requiring certified extraction',
      'মূল নিবন্ধিত দলিল চট্টগ্রাম বিভাগীয় রেকর্ড রুমে রক্ষিত থাকায় সার্টিফাইড কপি উত্তোলনের অনুরোধ',
      'Certified title extraction completed by Receiving DLAO Chattogram'
    );

    // Tasks for Malek case (Lawyer accountability)
    insertTaskStmt.run(
      'TSK-005',
      case5Id,
      'Submit Monthly Hearing Progress Report',
      'মাসিক শুনানির অগ্রগতি প্রতিবেদন দাখিল',
      'Panel Lawyer Advocate Farhana Yasmin must submit formal report on Senior Assistant Judge Court hearing',
      ROLES.B5_PANEL_LAWYER,
      'PER-LAWYER-B5',
      '2026-10-10',
      'HIGH',
      'PENDING'
    );

    insertTaskStmt.run(
      'TSK-006',
      case5Id,
      'Collect Certified CS/RS Porcha Copies',
      'সার্টিফাইড সিএস/আরএস পর্চার অনুলিপি সংগ্রহ',
      'Collect extracted land survey records from DLAO Chattogram referral',
      ROLES.B7_DLAO_ADMIN,
      'PER-ADMIN-B7',
      '2026-09-20',
      'MEDIUM',
      'COMPLETED'
    );

    // Incident for Abdul Malek case
    insertIncidentStmt.run(
      'INC-004',
      case5Id,
      'LAND_DISPUTE',
      '2021-03-10',
      'Radhanagar, Beanibazar, Sylhet',
      'Destruction of agricultural boundary fencing and cutting of timber trees by opposing party',
      'বিপক্ষ দল কর্তৃক সীমানা বেড়া ভাঙচুর এবং ফলজ ও কাঠের গাছ কেটে ফেলার ঘটনা',
      'HIGH',
      'Beanibazar Thana',
      'FIR-12/2021',
      'PER-OFFICER-B1'
    );

    // Audit log for Malek case
    insertAuditStmt.run(
      'AUD-004',
      case5Id,
      app5Id,
      AUDIT_ACTIONS.LAWYER_ASSIGNED,
      'PER-OFFICER-B1',
      ROLES.B1_DLAO_OFFICER,
      null,
      JSON.stringify({ lawyer_id: 'PER-LAWYER-B5', lawyer_name: 'Advocate Farhana Yasmin' }),
      'Assigned panel lawyer to ensure representation continuity'
    );

    insertAuditStmt.run(
      'AUD-005',
      case5Id,
      app5Id,
      AUDIT_ACTIONS.REFERRAL_CREATED,
      'PER-OFFICER-B1',
      ROLES.B1_DLAO_OFFICER,
      null,
      JSON.stringify({ referral_id: 'REF-001', to: 'DLAO Chattogram' }),
      'Referred to DLAO Chattogram for deed retrieval'
    );

    insertAuditStmt.run(
      'AUD-006',
      case5Id,
      app5Id,
      AUDIT_ACTIONS.REFERRAL_ACCEPTED,
      'PER-RECEIVING-B6',
      ROLES.B6_RECEIVING_DLAO,
      null,
      JSON.stringify({ referral_id: 'REF-001', status: 'ACCEPTED' }),
      'DLAO Chattogram accepted referral and initiated record search'
    );
  });

  seedTx();
  return true;
}

if (require.main === module) {
  try {
    seed();
    console.log('Database seeded successfully with all 5 citizen scenarios and 7 provider roles.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

module.exports = { seed };
