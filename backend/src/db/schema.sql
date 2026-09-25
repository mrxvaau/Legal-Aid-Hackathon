-- ADLASB Digital Legal Aid System Database Schema (SQLite)
-- Version 1.0.0

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
    applicant_id TEXT NOT NULL,
    representative_id TEXT,
    category TEXT NOT NULL,
    intake_channel TEXT NOT NULL,
    intake_office TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    summary TEXT NOT NULL,
    summary_bn TEXT,
    details_json TEXT, -- JSON
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
    details_json TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_cases_application ON cases(application_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_office ON cases(intake_office);
CREATE INDEX IF NOT EXISTS idx_cases_lawyer ON cases(assigned_lawyer_id);

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

-- 5. Provenance Log (Distinguishes spoken, translated, AI, human confirmed)
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

-- 6. Audit Log (Immutable record of state changes)
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

-- 7. Roles & Permissions Infrastructure
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

-- 8. Tasks (Accountability, SLA, Follow-ups)
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

-- 9. Referrals (Inter-district DLAO transfers, External Agencies)
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    referral_type TEXT NOT NULL CHECK(referral_type IN (
        'INTERNAL_TRANSFER', 'DLAO_TO_DLAO', 'POLICE_FORWARDING', 
        'SOCIAL_SERVICES', 'NGO_LEGAL_CLINIC', 'MEDIATION_BOARD'
    )),
    referring_office TEXT NOT NULL,
    receiving_office TEXT NOT NULL,
    referring_role TEXT NOT NULL,
    receiving_role TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN (
        'PENDING', 'TRANSMITTED', 'ACCEPTED', 'REJECTED', 'COMPLETED'
    )),
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

-- 10. Incident Links (Multiple reports, Thana GD/FIR links)
CREATE TABLE IF NOT EXISTS incident_links (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    incident_type TEXT NOT NULL,
    incident_date TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    description_bn TEXT,
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    police_station_jurisdiction TEXT,
    gd_or_fir_number TEXT,
    linked_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incidents_case ON incident_links(case_id);
