const { getDb } = require('./connection');
const { migrate } = require('./migrate');
const { ROLES, CASE_STATES, PROVENANCE_SOURCES, AUDIT_ACTIONS } = require('../utils/constants');

function seed(dbInstance = null) {
  const db = dbInstance || getDb();

  // Ensure schema, tables, and columns exist first
  migrate(db);

  // For maintenance re-seeding: temporarily drop immutability triggers to allow clean wipe
  db.exec(`
    DROP TRIGGER IF EXISTS prevent_audit_log_update;
    DROP TRIGGER IF EXISTS prevent_audit_log_delete;
  `);

  // Clear existing scenario data for clean idempotent seeding
  const clearTx = db.transaction(() => {
    db.prepare('DELETE FROM safe_contacts').run();
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

  // Re-run migration to re-apply triggers and ensure schema integrity
  migrate(db);

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

    // Scenario 1: Moyuri Akter (Unsafe contact, husband controls phone/NID)
    insertPersonStmt.run(
      'PER-CITIZEN-MOYURI',
      'NID-199856100101',
      'Moyuri Akter',
      'ময়ূরী আক্তার',
      'FEMALE',
      '01822000101 (COMPROMISED - Husband Monitored)',
      'moyuri.akter@example.com',
      'House 14, Ward 4, Mirpur',
      'Mirpur',
      'Dhaka',
      'Dhaka',
      JSON.stringify({
        income_bracket: 'BELOW_15000',
        vulnerability: 'DOMESTIC_VIOLENCE_SURVIVOR',
        phone_compromised: true,
        nid_confiscated_by_husband: true,
        safety_status: 'HIGH_RISK_PERPETRATOR_CONTROL',
        occupation: 'Homemaker'
      })
    );

    // Scenario 2: Ripon (Brother, Authorized Representative, Blind user, non-visual interaction)
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
        accessibility: {
          visual_impairment: true,
          interaction_mode: 'NON_VISUAL_VOICE_FIRST',
          screen_reader: true,
          no_captcha_required: true,
          no_visual_otp_required: true
        },
        occupation: 'Community Organizer'
      })
    );

    // Opposing party Faruk Hossain
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
      JSON.stringify({ role: 'RESPONDENT_HUSBAND', perpetrator_control_flag: true })
    );

    // Scenario 3: Nabila (Cyber harassment, fake/altered images, sensitive evidence)
    insertPersonStmt.run(
      'PER-CITIZEN-NABILA',
      'NID-200156100201',
      'Nabila',
      'নাবিলা',
      'FEMALE',
      '01933000201',
      'nabila.student@example.com',
      'Dhanmondi Road 8, Dhaka',
      'Dhanmondi',
      'Dhaka',
      'Dhaka',
      JSON.stringify({
        income_bracket: 'STUDENT_DEPENDENT',
        vulnerability: 'CYBER_IMAGE_BASED_HARASSMENT',
        confidentiality_requested: true,
        sensitive_evidence_on_file: true
      })
    );

    // Scenario 4: Nuching Marma (Indigenous CHT, Marma speaker, low literacy, UDC-assisted)
    insertPersonStmt.run(
      'PER-CITIZEN-NUCHING',
      'NID-199556100301',
      'Nuching Marma',
      'নুচিং মারমা',
      'FEMALE',
      '01555000301 (Unreliable Cellular Coverage)',
      null,
      'Dighinala Para, Baghaichhari',
      'Baghaichhari',
      'Rangamati',
      'Chattogram',
      JSON.stringify({
        income_bracket: 'EXTREME_POVERTY',
        vulnerability: 'INDIGENOUS_COMMUNITY_CHT',
        primary_language: 'Marma',
        literacy_level: 'LOW_ORAL_ONLY',
        connectivity_status: 'UNRELIABLE_OFFLINE_SYNC',
        occupation: 'Jhum Farmer'
      })
    );

    // Scenario 5: Abdul Malek (Elderly farmer, 7-month-old case, lawyer silent, no smartphone)
    insertPersonStmt.run(
      'PER-CITIZEN-MALEK',
      'NID-195256100401',
      'Abdul Malek',
      'আব্দুল মালেক',
      'MALE',
      '01744000401 (Unstable / Inactive Contact)',
      null,
      'Gram: Radhanagar, Beanibazar',
      'Beanibazar',
      'Sylhet',
      'Sylhet',
      JSON.stringify({
        age: 74,
        income_bracket: 'BELOW_10000',
        vulnerability: 'ELDERLY_MARGINAL_FARMER',
        has_smartphone: false,
        inquiry_mode: 'FEATURE_PHONE_USSD_OR_UDC_INQUIRY',
        contact_status: 'OUTDATED_PHONE_RELOCATION',
        occupation: 'Retired / Marginal Farmer'
      })
    );

    // ------------------------------------------------------------------------
    // 3. SEED CASES & RELATIONSHIPS
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
        assigned_officer_id, assigned_lawyer_id,
        filing_date, lawyer_last_active_at, lawyer_status,
        deadline_alert_level, citizen_inquiry_code, details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCasePersonStmt = db.prepare(`
      INSERT INTO case_people (
        id, case_id, person_id, role_in_case, relationship_to_applicant,
        authorization_doc_ref, is_primary_contact, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSafeContactStmt = db.prepare(`
      INSERT INTO safe_contacts (
        id, case_id, person_id, is_safe_contact_active, preferred_contact_method,
        unsafe_channels, safe_channel_details, restriction_reason, danger_level,
        confidentiality_notice, configured_by_id, configured_by_role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTaskStmt = db.prepare(`
      INSERT INTO tasks (
        id, case_id, title, title_bn, description, assigned_to_role,
        assigned_to_user_id, due_date, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertReferralStmt = db.prepare(`
      INSERT INTO referrals (
        id, case_id, referral_type, target_authority_type, referring_office, receiving_office,
        referring_role, receiving_role, status, acknowledgement_status, assigned_officer_id,
        acknowledged_at, reason, reason_bn, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertIncidentStmt = db.prepare(`
      INSERT INTO incident_links (
        id, case_id, incident_type, incident_date, location,
        description, description_bn, severity, is_sensitive_evidence,
        evidence_privacy_level, redacted_summary, police_station_jurisdiction,
        gd_or_fir_number, linked_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertProvStmt = db.prepare(`
      INSERT INTO provenance_log (
        id, case_id, application_id, entity_type, entity_id, field_name,
        source_type, source_language, target_language, author_id, author_role,
        is_secondhand_report, reported_for_person_id,
        source_details, raw_content, processed_content, confirmed_by, confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAuditStmt = db.prepare(`
      INSERT INTO audit_log (
        id, case_id, application_id, action, actor_id, actor_role,
        payload_before, payload_after, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEvidenceStmt = db.prepare(`
      INSERT INTO evidence_vault (
        id, case_id, incident_id, evidence_type, title, title_bn,
        original_filename, mime_type, file_size_bytes, hash_checksum,
        storage_ref, sensitivity_level, access_restrictions,
        evidence_status, submitted_by_id, submitted_by_role,
        chain_of_custody_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // ========================================================================
    // SCENARIO 1 & 2: MOYURI AKTER & RIPON
    // Safe contact active, husband controls phone/NID, brother Ripon (blind, voice-first)
    // Secondhand reporting provenance
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
      'Emergency domestic protection and maintenance filed via authorized representative Ripon. Safe contact mode required due to husband controlling primary phone and NID.',
      'অনুমোদিত প্রতিনিধি রিপনের মাধ্যমে জরুরি পারিবারিক সুরক্ষা ও খোরপোশ আবেদন। স্বামী কর্তৃক ফোন ও এনআইডি নিয়ন্ত্রিত হওয়ায় নিরাপদ যোগাযোগ মোড বাধ্যতামূলক।',
      JSON.stringify({
        safe_contact_mode_requested: true,
        perpetrator_controls_phone: true,
        representative_authorization_form: 'DLAO-REP-AUTH-2026-DH-091'
      }),
      ROLES.B1_DLAO_OFFICER,
      'PER-OFFICER-B1'
    );

    insertCaseStmt.run(
      case1Id,
      app1Id,
      'DLAO-DHK-2026-0042',
      'Moyuri Akter vs Faruk Hossain - Safe Contact & Protection Mode',
      'ময়ূরী আক্তার বনাম ফারুক হোসেন - নিরাপদ যোগাযোগ ও সুরক্ষা আবেদন',
      'FAMILY_DISPUTE',
      CASE_STATES.MEDIATION,
      'URGENT',
      'DLAO Dhaka',
      'Family Court Dhaka',
      'PER-OFFICER-B1',
      'PER-LAWYER-B5',
      '2026-09-01T10:00:00Z',
      '2026-09-20T11:00:00Z',
      'ACTIVE',
      'NORMAL',
      '16699-MOYURI-1042',
      JSON.stringify({ safe_contact_active: true, blind_representative_voice_intake: true })
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
      'Applicant in high-risk domestic control; phone/NID confiscated by husband'
    );

    // Link Ripon as Authorized Representative (Blind user, voice-first interaction)
    insertCasePersonStmt.run(
      'CP-002',
      case1Id,
      'PER-CITIZEN-RIPON',
      'AUTHORIZED_REPRESENTATIVE',
      'BROTHER',
      'DLAO-REP-AUTH-2026-DH-091',
      1,
      'Brother & authorized representative; blind user (non-visual / voice-first interaction, zero visual CAPTCHA dependency)'
    );

    // Link Opposing Party
    insertCasePersonStmt.run(
      'CP-003',
      case1Id,
      'PER-OPP-FARUK',
      'OPPOSING_PARTY',
      'SPOUSE',
      null,
      0,
      'Respondent husband; contact strictly restricted'
    );

    // Configure Safe Contact for Moyuri
    insertSafeContactStmt.run(
      'SC-001',
      case1Id,
      'PER-CITIZEN-MOYURI',
      1,
      'IN_PERSON_REPRESENTATIVE',
      JSON.stringify(['PRIMARY_PHONE', 'DIRECT_SMS', 'UNSCHEDULED_HOME_VISIT']),
      'Contact ONLY through brother Ripon at 01822000102. NEVER send SMS or place calls to applicant 01822000101 number as husband intercepts all incoming communications.',
      'Perpetrator husband controls phone, monitors messages, and confiscated NID card.',
      'HIGH',
      'RESTRICTED: Safe Contact Protection Protocol Active. Do not expose safe channel to unauthorized parties.',
      'PER-OFFICER-B1',
      ROLES.B1_DLAO_OFFICER
    );

    // Secondhand Reporting Provenance: Ripon reporting on behalf of Moyuri
    insertProvStmt.run(
      'PRV-001',
      case1Id,
      app1Id,
      'application',
      app1Id,
      'intake_grievance_narrative',
      PROVENANCE_SOURCES.SPOKEN_BY_PERSON,
      'bn',
      'bn',
      'PER-CITIZEN-RIPON',
      ROLES.AUTHORIZED_REPRESENTATIVE,
      1, // is_secondhand_report = true
      'PER-CITIZEN-MOYURI', // reported for Moyuri
      JSON.stringify({
        intake_mode: 'NON_VISUAL_VOICE_FIRST',
        reporter: 'Ripon (Brother)',
        affected_person: 'Moyuri Akter',
        authorization_verified: true
      }),
      'আমার বোন ময়ূরীকে তার স্বামী ফারুক শারীরিক নির্যাতন করছে এবং ফোন ও এনআইডি কেড়ে নিয়েছে। বোন সরাসরি আসতে ভয় পাচ্ছে বিধায় আমি অনুমোদিত প্রতিনিধি হিসেবে অভিযোগ দায়ের করছি।',
      'Secondhand oral report received from authorized representative Ripon on behalf of applicant Moyuri Akter via accessible voice intake.',
      'PER-OFFICER-B1',
      '2026-09-01T10:30:00Z'
    );

    // Tasks for Moyuri case
    insertTaskStmt.run(
      'TSK-001',
      case1Id,
      'Serve Safe Mediation Summons to Respondent',
      'বিপক্ষ স্বামীকে সতর্কতামূলক সালিশি নোটিশ প্রদান',
      'Serve confidential summons to Faruk Hossain without disclosing applicant temporary shelter address',
      ROLES.B2_LEGAL_AID_OFFICER,
      'PER-MEDIATOR-B2',
      '2026-10-02',
      'URGENT',
      'PENDING'
    );

    // Audit logs for Moyuri & Ripon
    insertAuditStmt.run(
      'AUD-001',
      case1Id,
      app1Id,
      AUDIT_ACTIONS.SAFE_CONTACT_CONFIGURED,
      'PER-OFFICER-B1',
      ROLES.B1_DLAO_OFFICER,
      null,
      JSON.stringify({ preferred_method: 'IN_PERSON_REPRESENTATIVE', safe_channel: 'Ripon (01822000102)' }),
      'Configured safe-contact mode due to perpetrator phone interception'
    );

    insertAuditStmt.run(
      'AUD-002',
      case1Id,
      app1Id,
      AUDIT_ACTIONS.REPRESENTATIVE_LINKED,
      'PER-OFFICER-B1',
      ROLES.B1_DLAO_OFFICER,
      null,
      JSON.stringify({ representative: 'Ripon', relation: 'BROTHER', auth_doc: 'DLAO-REP-AUTH-2026-DH-091' }),
      'Registered brother Ripon as authorized representative under accessible non-visual intake'
    );

    // ========================================================================
    // SCENARIO 3: NABILA (CORRECTED)
    // Cyber harassment, fake/altered images, sensitive evidence, urgent escalation,
    // referral to Police Cyber Support for Women with acknowledgement tracking
    // ========================================================================
    const app3Id = 'APP-20260910-0003';
    const case3Id = 'CASE-20260910-0003';

    insertAppStmt.run(
      app3Id,
      'PER-CITIZEN-NABILA',
      null,
      'GENDER_VIOLENCE',
      'HELPLINE_16699',
      'National Helpline 16699 Central',
      'CONVERTED_TO_CASE',
      'Extortion and online defamation through non-consensual distribution of altered/morphed intimate images via social messaging groups. Urgent takedown and cyber crime protection sought.',
      'অনুমতি ব্যতিরেকে বিকৃত/ভুয়া আপত্তিকর ছবি তৈরি করে সামাজিক যোগাযোগ মাধ্যমে ছড়িয়ে দেওয়ার হুমকি ও ব্ল্যাকমেইল। জরুরি ডিজিটাল সুরক্ষা ও আইনগত পদক্ষেপের আবেদন।',
      JSON.stringify({
        is_cyber_crime: true,
        sensitive_evidence: true,
        escalation_target: 'POLICE_CYBER_SUPPORT_FOR_WOMEN',
        intake_call_id: 'CALL-16699-CYBER-7781'
      }),
      ROLES.B3_HELPLINE_AGENT,
      'PER-HELPLINE-B3'
    );

    insertCaseStmt.run(
      case3Id,
      app3Id,
      'DLAO-DHK-2026-0914',
      'Nabila - Cyber Extortion & Image-Based Abuse Protection',
      'নাবিলা - সাইবার ব্ল্যাকমেইল ও বিকৃত ছবি অপব্যবহার রোধ মামলা',
      'GENDER_VIOLENCE',
      CASE_STATES.REFERRED,
      'URGENT',
      'DLAO Dhaka',
      'Cyber Tribunal Dhaka',
      'PER-OFFICER-B1',
      'PER-LAWYER-B5',
      '2026-09-10T14:00:00Z',
      '2026-09-12T15:00:00Z',
      'ACTIVE',
      'NORMAL',
      '16699-NABILA-9914',
      JSON.stringify({
        sensitive_evidence_restricted: true,
        cyber_tribunal_jurisdiction: true
      })
    );

    insertCasePersonStmt.run(
      'CP-004',
      case3Id,
      'PER-CITIZEN-NABILA',
      'APPLICANT',
      'SELF',
      null,
      1,
      'Survivor of image-based cyber blackmail; high privacy protection mandated'
    );

    // Sensitive Evidence Incident for Nabila
    insertIncidentStmt.run(
      'INC-002',
      case3Id,
      'CYBER_HARASSMENT_IMAGE_ABUSE',
      '2026-09-09',
      'Digital / Telegram Group & Facebook Messenger',
      'Perpetrator created morphed and altered non-consensual explicit images from victim public profile, demanding 50,000 BDT or threatened transmission to university contacts.',
      'আবেদনকারীর ফেসবুক ছবি বিকৃত করে আপত্তিকর ছবি তৈরি এবং ৫০ হাজার টাকা না দিলে বন্ধুদের মেসেঞ্জারে ছড়ানোর হুমকি।',
      'CRITICAL',
      1, // is_sensitive_evidence = true
      'STRICTLY_RESTRICTED_IMAGE_ABUSE',
      '[RESTRICTED EVIDENCE]: 6 screenshots of blackmail messages and hash of 2 altered images stored in secure evidentiary vault.',
      'Dhanmondi Thana',
      'GD-1102/2026',
      'PER-HELPLINE-B3'
    );

    // Referral with Ownership & Acknowledgement Tracking for Nabila
    insertReferralStmt.run(
      'REF-002',
      case3Id,
      'CYBER_CRIME_DIVISION',
      'CYBER_CRIME_POLICE',
      'National Helpline 16699 Central',
      'Police Cyber Support for Women (PCSW) - CID HQ',
      ROLES.B3_HELPLINE_AGENT,
      ROLES.B6_RECEIVING_DLAO,
      'TRANSMITTED',
      'ACKNOWLEDGED', // Acknowledgement status tracked
      'OFFICER-CID-CYBER-88', // Ownership tracked
      '2026-09-11T09:30:00Z',
      'Emergency content takedown and preservation of digital server logs under Cyber Security Act.',
      'সাইবার নিরাপত্তা আইন অনুযায়ী জরুরি কনটেন্ট অপসারণ ও সার্ভার লগ সংরক্ষণের অনুরোধ।',
      'CID Cyber Unit acknowledged receipt; formal BTRC URL blocking notice served.'
    );

    // Sensitive Evidence Vault items for Nabila
    insertEvidenceStmt.run(
      'EV-20260910-001',
      case3Id,
      'INC-002',
      'ALTERED_IMAGE',
      'Morphed & Altered Non-Consensual Image Sample',
      'বিকৃত ও অশালীনভাবে সম্পাদিত ছবি নমুনা',
      'victim_altered_photo_telegram_msg_01.jpg',
      'image/jpeg',
      2458291,
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'vault://secure-enclave/cases/CASE-20260910-0003/evidence/ev-001.dat (Simulated Secure Storage)',
      'STRICTLY_RESTRICTED_IMAGE_ABUSE',
      JSON.stringify(['RESTRICT_DLAO_ONLY', 'STRICT_AUDIT_LOGGED', 'NO_PUBLIC_ACCESS']),
      'REGISTERED',
      'PER-CITIZEN-NABILA',
      ROLES.CITIZEN_APPLICANT,
      'Digital cryptographic hash generated upon 16699 helpline intake. Binary isolated in secure evidentiary vault. Access permanently audited.'
    );

    insertEvidenceStmt.run(
      'EV-20260910-002',
      case3Id,
      'INC-002',
      'BLACKMAIL_MESSAGE_LOG',
      'Telegram & Messenger Extortion Chat Logs (50,000 BDT Demand)',
      'টেলিগ্রাম ও মেসেঞ্জার চাঁদা দাবির চ্যাট লগ (৫০,০০০ টাকা চাঁদা দাবি)',
      'extortion_threat_chat_export_20260909.pdf',
      'application/pdf',
      1184920,
      'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
      'vault://secure-enclave/cases/CASE-20260910-0003/evidence/ev-002.dat (Simulated Secure Storage)',
      'CONFIDENTIAL',
      JSON.stringify(['OFFICER_REVIEW_ONLY', 'CHAIN_OF_CUSTODY_MANDATORY']),
      'FORWARDED_TO_POLICE',
      'PER-HELPLINE-B3',
      ROLES.B3_HELPLINE_AGENT,
      'Forwarded as evidentiary bundle to Police Cyber Support for Women (PCSW), CID HQ under tracking REF-002.'
    );

    // Audit logs for Nabila's sensitive evidence & referral
    insertAuditStmt.run(
      'AUD-NABILA-001',
      case3Id,
      app3Id,
      AUDIT_ACTIONS.SENSITIVE_EVIDENCE_REGISTERED,
      'PER-HELPLINE-B3',
      ROLES.B3_HELPLINE_AGENT,
      null,
      JSON.stringify({
        evidence_id: 'EV-20260910-001',
        sensitivity_level: 'STRICTLY_RESTRICTED_IMAGE_ABUSE',
        hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      }),
      'Registered strictly restricted non-consensual altered image evidence in secure evidentiary vault'
    );

    insertAuditStmt.run(
      'AUD-NABILA-002',
      case3Id,
      app3Id,
      AUDIT_ACTIONS.REFERRAL_CREATED,
      'PER-HELPLINE-B3',
      ROLES.B3_HELPLINE_AGENT,
      null,
      JSON.stringify({
        referral_id: 'REF-002',
        target: 'Police Cyber Support for Women (PCSW) - CID HQ',
        urgency: 'HIGH'
      }),
      'Urgent referral dispatched to Police Cyber Support for Women (PCSW), CID HQ for content takedown'
    );

    insertAuditStmt.run(
      'AUD-NABILA-003',
      case3Id,
      app3Id,
      AUDIT_ACTIONS.REFERRAL_ACKNOWLEDGED,
      'OFFICER-CID-CYBER-88',
      ROLES.B6_RECEIVING_DLAO,
      JSON.stringify({ acknowledgement_status: 'UNACKNOWLEDGED' }),
      JSON.stringify({
        acknowledgement_status: 'ACKNOWLEDGED',
        assigned_officer_id: 'OFFICER-CID-CYBER-88'
      }),
      'CID Cyber Unit acknowledged receipt; receiving ownership assigned to OFFICER-CID-CYBER-88'
    );

    // Task for Nabila Case
    insertTaskStmt.run(
      'TSK-003',
      case3Id,
      'Expedite BTRC Emergency Content Removal Request',
      'বিটিআরসি জরুরি কনটেন্ট ব্লকিং আবেদন নিশ্চিতকরণ',
      'Coordinate with CID liaison officer for URL removal from target Telegram channel',
      ROLES.B7_DLAO_ADMIN,
      'PER-ADMIN-B7',
      '2026-09-28',
      'URGENT',
      'IN_PROGRESS'
    );

    // ========================================================================
    // SCENARIO 4: NUCHING MARMA
    // Indigenous, Marma language, low literacy, UDC-assisted, unreliable connectivity
    // Full provenance chain: spoken -> translated -> typed -> AI -> human confirmed
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
        intake_mode: 'UDC_ASSISTED',
        connectivity_mode: 'OFFLINE_SYNC_PERIODIC',
        primary_dialect: 'Marma'
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
      '2026-09-12T11:00:00Z',
      null,
      'ACTIVE',
      'NORMAL',
      '16699-NUCHING-3014',
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
      'Indigenous applicant speaking Marma; assisted by UDC Entrepreneur Minu Akhter'
    );

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
      0,
      null,
      JSON.stringify({ audio_recording_ref: 'UDC-AUDIO-RNG-MARMA-04' }),
      'Original oral narrative spoken by Nuching Marma in Marma language describing ancestral boundaries.',
      'Oral audio recording archived at Baghaichhari UDC offline terminal.',
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
      0,
      null,
      JSON.stringify({ translator: 'Minu Akhter (UDC)', oral_translation: true }),
      'মারমা ভাষা থেকে বাংলায় অনুবাদ: তিন প্রজন্ম ধরে চাষাবাদ করা পাহাড়ি জমি থেকে উচ্ছেদের হুমকি দেওয়া হচ্ছে।',
      'Eviction threats against ancestral hill farming plot cultivated over three generations.',
      null,
      null
    );

    // 3. Typed by Staff at UDC
    insertProvStmt.run(
      'PRV-005',
      case4Id,
      app4Id,
      'application',
      app4Id,
      'intake_text_entry',
      PROVENANCE_SOURCES.TYPED_BY_STAFF,
      'bn',
      'bn',
      'PER-UDC-B4',
      ROLES.B4_UDC_ENTREPRENEUR,
      0,
      null,
      JSON.stringify({ terminal: 'UDC_TERMINAL_BAGHAICHHARI_01' }),
      'আবেদনকারী নিরক্ষর হওয়ায় ইউডিসি উদ্যোক্তা আবেদনকারীর উপস্থিতিতে বক্তব্য টাইপ করেছেন।',
      'Typed into intake terminal by UDC Entrepreneur on behalf of low-literacy applicant.',
      null,
      null
    );

    // 4. Inferred / AI-Assisted Classification (EXPLICITLY UNCONFIRMED)
    insertProvStmt.run(
      'PRV-006',
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
      0,
      null,
      JSON.stringify({ model: 'ADLASB-RulesEngine-v1', confidence: 0.94, disclaimer: 'Non-binding pre-assessment; human officer verification mandatory' }),
      'AI প্রস্তাবনা: CHT রেগুলেশন ১৯০০ অনুযায়ী নিষেধাজ্ঞা মামলা উপযুক্ত।',
      'AI recommendation: Temporary injunction claim under CHT Regulation 1900.',
      null, // UNCONFIRMED
      null
    );

    // 5. Confirmed by Human Officer
    insertProvStmt.run(
      'PRV-007',
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
      0,
      null,
      JSON.stringify({ headman_verification_doc: 'HEADMAN-CERT-BG-41' }),
      'ডিএলএও কর্মকর্তা হেডম্যান সনদের সাথে মিলিয়ে অনুবাদ ও তথ্য চূড়ান্তভাবে নিশ্চিত করেছেন।',
      'DLAO Officer certified translated narrative against Mouza Headman customary register.',
      'PER-RECEIVING-B6',
      '2026-09-13T11:00:00Z'
    );

    // ========================================================================
    // SCENARIO 5: ABDUL MALEK (CORRECTED)
    // 7-month-old case (filed ~Feb 2026), unstable contact info, panel lawyer silent,
    // lawyer accountability alerts, citizen inquiry without smartphone
    // ========================================================================
    const app5Id = 'APP-20260220-0005';
    const case5Id = 'CASE-20260220-0005';

    insertAppStmt.run(
      app5Id,
      'PER-CITIZEN-MALEK',
      null,
      'LAND_PROPERTY',
      'DLAO_WALKIN',
      'DLAO Sylhet',
      'CONVERTED_TO_CASE',
      'Boundary encroachment and title dispute on smallholder agricultural homestead land in Beanibazar. Filed 7 months ago; citizen lacks smartphone.',
      'বিয়ানীবাজারে পৈতৃক বসতভিটার সীমানা জবরদখল সংক্রান্ত স্বত্ব বিরোধ। ৭ মাস পূর্বে দায়েরকৃত; আবেদনকারীর স্মার্টফোন নেই।',
      JSON.stringify({
        initial_filing_date: '2026-02-20',
        months_elapsed: 7,
        khatian_number: 'RS-4091',
        feature_phone_user: true
      }),
      ROLES.B1_DLAO_OFFICER,
      'PER-OFFICER-B1'
    );

    insertCaseStmt.run(
      case5Id,
      app5Id,
      'DLAO-SYL-2026-0048',
      'Abdul Malek vs Rashid Ahmed - Title Suit 44/2026 (7 Months Elapsed)',
      'আব্দুল মালেক বনাম রশিদ আহমদ - স্বত্ব মামলা ৪৪/২০২৬ (৭ মাস চলমান)',
      'LAND_PROPERTY',
      CASE_STATES.WAITING_FOR_ACTION,
      'HIGH',
      'DLAO Sylhet',
      'Senior Assistant Judge Court Beanibazar, Sylhet',
      'PER-OFFICER-B1',
      'PER-LAWYER-B5',
      '2026-02-20T10:00:00Z', // 7 months ago
      '2026-06-15T09:00:00Z', // Lawyer last active >90 days ago!
      'SILENT_UNRESPONSIVE',   // Lawyer has gone silent
      'CRITICAL_OVERDUE',     // Accountability alert active
      '16699-MALEK-7492',     // USSD/voice token for non-smartphone query
      JSON.stringify({
        court_case_no: 'Title Suit 44/2026',
        months_pending: 7,
        lawyer_silent_days: 102,
        citizen_inquiry_methods: ['USSD *16699*7492#', 'IVR Helpline 16699', 'Local UDC Walk-in']
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
      'Elderly farmer (74 yrs); case active for 7 months; unreachable on old phone; uses USSD token'
    );

    // Assign Panel Lawyer Farhana Yasmin (now silent)
    insertCasePersonStmt.run(
      'CP-008',
      case5Id,
      'PER-LAWYER-B5',
      'PANEL_LAWYER',
      'LEGAL_COUNSEL',
      'BAR-SYL-1982-205',
      0,
      'Assigned panel lawyer; currently flagged SILENT_UNRESPONSIVE (no hearing report submitted in >90 days)'
    );

    // Overdue task triggering lawyer accountability alert
    insertTaskStmt.run(
      'TSK-005',
      case5Id,
      'Submit Overdue Senior Assistant Judge Hearing Progress Report',
      'শুনানির অতিজরুরি বকেয়া অগ্রগতি প্রতিবেদন দাখিল (সতর্কবার্তা)',
      'CRITICAL DEADLINE EXPIRED: Panel Lawyer Advocate Farhana Yasmin has failed to submit statutory monthly report since June 2026. DLAO formal warning issued.',
      ROLES.B5_PANEL_LAWYER,
      'PER-LAWYER-B5',
      '2026-07-15', // Overdue!
      'URGENT',
      'PENDING'
    );

    // Audit log for Abdul Malek lawyer silence alert
    insertAuditStmt.run(
      'AUD-004',
      case5Id,
      app5Id,
      AUDIT_ACTIONS.LAWYER_SILENCE_ALERTED,
      'PER-OFFICER-B1',
      ROLES.B1_DLAO_OFFICER,
      JSON.stringify({ lawyer_status: 'ACTIVE' }),
      JSON.stringify({ lawyer_status: 'SILENT_UNRESPONSIVE', alert_level: 'CRITICAL_OVERDUE' }),
      'Automated deadline monitor flagged panel lawyer inactive for 102 days. Show-cause notice queued.'
    );

    // ========================================================================
    // SCENARIO 6: RIPON STANDALONE APPLICANT (A2 ACCESSIBILITY FIX)
    // Ripon has his own independent legal aid case as a primary applicant
    // (Persons with Disabilities Rights and Protection Act 2013)
    // Non-visual, screen-reader optimized, voice-first, no CAPTCHA, no visual OTP
    // ========================================================================
    const appRiponId = 'APP-20260920-RIPON';
    const caseRiponId = 'CASE-20260920-RIPON';

    insertAppStmt.run(
      appRiponId,
      'PER-CITIZEN-RIPON',
      null, // Self-represented applicant, no representative needed
      'DISABILITY_RIGHTS',
      'VOICE_WEB_ACCESSIBLE',
      'DLAO Dhaka',
      'CONVERTED_TO_CASE',
      'Independent disability rights and public transport accessibility claim filed directly by Ripon via accessible non-visual portal.',
      'প্রতিবন্ধী ব্যক্তির অধিকার ও সুরক্ষা আইন ২০১৩ অনুযায়ী স্বাধীনভাবে দায়েরকৃত গণপরিবহন অভিগম্যতা মামলা।',
      JSON.stringify({
        is_independent_applicant: true,
        accessibility_mode: 'NON_VISUAL_VOICE_FIRST',
        no_captcha_verified: true,
        no_visual_otp_required: true,
        screen_reader_optimized: true
      }),
      ROLES.CITIZEN_APPLICANT,
      'PER-CITIZEN-RIPON'
    );

    insertCaseStmt.run(
      caseRiponId,
      appRiponId,
      'DLAO-DHK-2026-0888',
      'Ripon vs Dhaka Metro Bus Consortium - Public Transport Disability Access',
      'রিপন বনাম ঢাকা মেট্রো বাস কনসোর্টিয়াম - গণপরিবহনে প্রতিবন্ধী ব্যক্তির প্রবেশাধিকার নিশ্চিতকরণ',
      'CIVIL_GENERAL',
      CASE_STATES.ASSIGNED,
      'HIGH',
      'DLAO Dhaka',
      'Court of Joint District Judge 1st Court Dhaka',
      'PER-OFFICER-B1',
      'PER-LAWYER-B5',
      '2026-09-18T10:00:00Z',
      '2026-09-22T14:00:00Z',
      'ACTIVE',
      'NORMAL',
      '16699-RIPON-8888',
      JSON.stringify({
        independent_applicant: true,
        applicant_is_visually_impaired: true,
        non_visual_interaction: true
      })
    );

    // Link Ripon as primary APPLICANT in his own case
    insertCasePersonStmt.run(
      'CP-RIPON-SELF',
      caseRiponId,
      'PER-CITIZEN-RIPON',
      'APPLICANT',
      'SELF',
      null,
      1,
      'Ripon acting as independent primary applicant without sighted helper.'
    );

    // Initial audit log for Ripon standalone case creation
    insertAuditStmt.run(
      'AUD-RIPON-001',
      caseRiponId,
      appRiponId,
      AUDIT_ACTIONS.CASE_CREATED,
      'PER-CITIZEN-RIPON',
      ROLES.CITIZEN_APPLICANT,
      null,
      JSON.stringify({
        case_id: caseRiponId,
        applicant_id: 'PER-CITIZEN-RIPON',
        inquiry_code: '16699-RIPON-8888',
        accessibility_mode: 'NON_VISUAL_VOICE_FIRST'
      }),
      'Standalone accessible case created independently by Ripon (Non-visual voice-first intake).'
    );
  });

  seedTx();
  return true;
}

if (require.main === module) {
  try {
    seed();
    console.log('Database seeded successfully with corrected 5 citizen scenarios and 7 provider roles.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

module.exports = { seed };
