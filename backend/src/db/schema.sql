-- ADLASB Digital Legal Aid System Database Schema (SQLite)
-- Version 2.0.0 (Phase 1 Compliance & Flow 1 Foundation)

PRAGMA foreign_keys = ON;

-- 1. Central People Registry
CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    national_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    full_name_bn TEXT,
    gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN')) DEFAULT 'UNKNOWN',
    date_of_birth TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    upazila TEXT,
    district TEXT NOT NULL,
    division TEXT NOT NULL,
    socio_economic_profile TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_people_phone ON people(phone);
CREATE INDEX IF NOT EXISTS idx_people_nid ON people(national_id);
CREATE INDEX IF NOT EXISTS idx_people_district ON people(district);

-- 2. Applications (Intake Stage)
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    client_request_id TEXT UNIQUE,
    applicant_id TEXT NOT NULL,
    representative_id TEXT,
    category TEXT NOT NULL,
    intake_channel TEXT NOT NULL,
    intake_office TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    summary TEXT NOT NULL,
    summary_bn TEXT,
    details_json TEXT, -- JSON
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'SYNCED',
    created_by_role TEXT NOT NULL,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (applicant_id) REFERENCES people(id) ON DELETE RESTRICT,
    FOREIGN KEY (representative_id) REFERENCES people(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_apps_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_apps_office ON applications(intake_office);
CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_client_req ON applications(client_request_id) WHERE client_request_id IS NOT NULL;

-- 3. Core Cases
CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL UNIQUE,
    case_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_bn TEXT,
    category TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN (
        'NEW', 'INTAKE', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 
        'REFERRED', 'MEDIATION', 'SETTLEMENT_DRAFT', 'WAITING_FOR_ACTION', 
        'RESOLVED', 'CLOSED'
    )),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    intake_office TEXT NOT NULL,
    court_name TEXT,
    assigned_officer_id TEXT,
    assigned_lawyer_id TEXT,
    filing_date TEXT NOT NULL DEFAULT (datetime('now')),
    lawyer_last_active_at TEXT,
    lawyer_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(lawyer_status IN ('ACTIVE', 'SILENT_UNRESPONSIVE', 'WARNED', 'REASSIGNED', 'AT_RISK', 'OVERDUE', 'ESCALATED')),
    deadline_alert_level TEXT NOT NULL DEFAULT 'NORMAL' CHECK(deadline_alert_level IN ('NORMAL', 'WARNING_APPROACHING', 'CRITICAL_OVERDUE', 'AT_RISK', 'OVERDUE', 'ESCALATED')),
    citizen_inquiry_code TEXT, -- Token for non-smartphone / USSD / IVR inquiry
    details_json TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_cases_application ON cases(application_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_office ON cases(intake_office);
CREATE INDEX IF NOT EXISTS idx_cases_lawyer ON cases(assigned_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_cases_inquiry_code ON cases(citizen_inquiry_code);

-- 4. Case-People Associative Registry
CREATE TABLE IF NOT EXISTS case_people (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    person_id TEXT NOT NULL,
    role_in_case TEXT NOT NULL CHECK(role_in_case IN (
        'APPLICANT', 'AUTHORIZED_REPRESENTATIVE', 'OPPOSING_PARTY', 
        'WITNESS', 'VICTIM', 'PANEL_LAWYER', 'MEDIATOR', 'GUARDIAN'
    )),
    relationship_to_applicant TEXT DEFAULT 'SELF',
    authorization_doc_ref TEXT,
    is_primary_contact INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT,
    UNIQUE(case_id, person_id, role_in_case)
);

CREATE INDEX IF NOT EXISTS idx_case_people_case ON case_people(case_id);
CREATE INDEX IF NOT EXISTS idx_case_people_person ON case_people(person_id);

-- 5. Safe Contacts Configuration (Strict Protection Mode)
CREATE TABLE IF NOT EXISTS safe_contacts (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    person_id TEXT NOT NULL,
    is_safe_contact_active INTEGER NOT NULL DEFAULT 1,
    preferred_contact_method TEXT NOT NULL, -- e.g. 'IN_PERSON_REPRESENTATIVE', 'TRUSTED_ALTERNATIVE_PHONE', 'NO_PHONE_CALLS'
    unsafe_channels TEXT NOT NULL, -- JSON array e.g. ["PRIMARY_PHONE", "SMS", "DIRECT_HOME_VISIT"]
    safe_channel_details TEXT, -- Encrypted/restricted safe instructions e.g. "Contact brother Ripon only"
    restriction_reason TEXT NOT NULL, -- e.g. "Husband controls phone and monitors incoming SMS/calls"
    danger_level TEXT NOT NULL DEFAULT 'HIGH' CHECK(danger_level IN ('MODERATE', 'HIGH', 'EXTREME')),
    confidentiality_notice TEXT,
    configured_by_id TEXT NOT NULL,
    configured_by_role TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_safe_contacts_case ON safe_contacts(case_id);
CREATE INDEX IF NOT EXISTS idx_safe_contacts_person ON safe_contacts(person_id);

-- 6. Provenance Log (Distinguishes spoken, translated, typed, AI, human confirmed)
CREATE TABLE IF NOT EXISTS provenance_log (
    id TEXT PRIMARY KEY,
    case_id TEXT,
    application_id TEXT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK(source_type IN (
        'spoken_by_person', 'typed_by_person', 'typed_by_staff', 
        'translated', 'ai_assisted', 'inferred', 'confirmed_by_human'
    )),
    source_language TEXT,
    target_language TEXT,
    author_id TEXT,
    author_role TEXT NOT NULL,
    is_secondhand_report INTEGER NOT NULL DEFAULT 0,
    reported_for_person_id TEXT,
    source_details TEXT, -- JSON or explanatory string
    raw_content TEXT,
    processed_content TEXT,
    confirmed_by TEXT,
    confirmed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_prov_case ON provenance_log(case_id);
CREATE INDEX IF NOT EXISTS idx_prov_entity ON provenance_log(entity_type, entity_id);

-- 7. Audit Log (Strictly Immutable Record of State Changes)
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    case_id TEXT,
    application_id TEXT,
    action TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    actor_ip TEXT,
    payload_before TEXT, -- JSON
    payload_after TEXT, -- JSON
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_log(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- IMMUTABILITY TRIGGERS: Prevent UPDATE or DELETE on audit_log
CREATE TRIGGER IF NOT EXISTS prevent_audit_log_update
BEFORE UPDATE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'IMMUTABLE_VIOLATION: Audit log entries cannot be modified.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_audit_log_delete
BEFORE DELETE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'IMMUTABLE_VIOLATION: Audit log entries cannot be deleted.');
END;

-- 8. Roles & Permissions Infrastructure
CREATE TABLE IF NOT EXISTS roles (
    role_id TEXT PRIMARY KEY,
    role_code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    description TEXT,
    permissions_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    role_id TEXT NOT NULL,
    office TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- 9. Tasks (Accountability, SLA, Follow-ups)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    title TEXT NOT NULL,
    title_bn TEXT,
    description TEXT,
    assigned_to_role TEXT NOT NULL,
    assigned_to_user_id TEXT,
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    completed_at TEXT,
    completed_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_case ON tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_role ON tasks(assigned_to_role);

-- 10. Referrals (Inter-district, Police, OCC, Cyber Division)
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    referral_type TEXT NOT NULL CHECK(referral_type IN (
        'INTERNAL_TRANSFER', 'DLAO_TO_DLAO', 'POLICE_FORWARDING', 
        'SOCIAL_SERVICES', 'NGO_LEGAL_CLINIC', 'MEDIATION_BOARD',
        'CYBER_CRIME_DIVISION', 'ONE_STOP_CRISIS_CENTRE'
    )),
    target_authority_type TEXT NOT NULL DEFAULT 'DLAO',
    referring_office TEXT NOT NULL,
    receiving_office TEXT NOT NULL,
    referring_role TEXT NOT NULL,
    receiving_role TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN (
        'PENDING', 'SENT', 'TRANSMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ACCEPTED', 'REJECTED', 'COMPLETED'
    )),
    acknowledgement_status TEXT NOT NULL DEFAULT 'UNACKNOWLEDGED' CHECK(acknowledgement_status IN (
        'UNACKNOWLEDGED', 'ACKNOWLEDGED', 'ACTION_COMMENCED', 'CLOSED'
    )),
    assigned_officer_id TEXT,
    acknowledged_at TEXT,
    reason TEXT NOT NULL,
    reason_bn TEXT,
    notes TEXT,
    transferred_at TEXT,
    accepted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_referrals_case ON referrals(case_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- 11. Incident Links (Evidence Sensitivity & Police Jurisdiction)
CREATE TABLE IF NOT EXISTS incident_links (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    incident_type TEXT NOT NULL,
    incident_date TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    description_bn TEXT,
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    is_sensitive_evidence INTEGER NOT NULL DEFAULT 0,
    evidence_privacy_level TEXT NOT NULL DEFAULT 'STANDARD' CHECK(evidence_privacy_level IN (
        'STANDARD', 'CONFIDENTIAL', 'STRICTLY_RESTRICTED_IMAGE_ABUSE'
    )),
    redacted_summary TEXT,
    police_station_jurisdiction TEXT,
    gd_or_fir_number TEXT,
    linked_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incidents_case ON incident_links(case_id);

-- 12. Sensitive Evidence Vault (Flow 3 - Information Governance & Chain-of-Custody)
CREATE TABLE IF NOT EXISTS evidence_vault (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    incident_id TEXT,
    evidence_type TEXT NOT NULL, -- e.g. 'ALTERED_IMAGE', 'BLACKMAIL_MESSAGE_LOG', 'URL_SCREENSHOT', 'AUDIO_RECORDING', 'OTHER'
    title TEXT NOT NULL,
    title_bn TEXT,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes INTEGER,
    hash_checksum TEXT NOT NULL, -- SHA-256
    storage_ref TEXT NOT NULL, -- Prototype vault reference URI
    sensitivity_level TEXT NOT NULL CHECK(sensitivity_level IN (
        'STANDARD', 'CONFIDENTIAL', 'STRICTLY_RESTRICTED_IMAGE_ABUSE'
    )) DEFAULT 'CONFIDENTIAL',
    access_restrictions TEXT, -- JSON array of restrictions
    evidence_status TEXT NOT NULL CHECK(evidence_status IN (
        'REGISTERED', 'VERIFIED', 'SUBMITTED_TO_COURT', 'FORWARDED_TO_POLICE', 'SEALED'
    )) DEFAULT 'REGISTERED',
    submitted_by_id TEXT NOT NULL,
    submitted_by_role TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    chain_of_custody_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (incident_id) REFERENCES incident_links(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence_vault(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_sensitivity ON evidence_vault(sensitivity_level);

