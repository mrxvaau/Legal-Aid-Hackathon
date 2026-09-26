# ADLASB Digital Legal Aid System — Database Specification

## 1. Engine & Configuration
- **Engine**: SQLite 3 (via `better-sqlite3`)
- **Foreign Keys**: Enforced at connection time (`PRAGMA foreign_keys = ON;`)
- **Journal Mode**: Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) for high concurrency and resilience
- **Immutability Enforcement**: SQLite triggers (`prevent_audit_log_update`, `prevent_audit_log_delete`) physically prevent any UPDATE or DELETE operations on historical audit records.
- **File Location**: `backend/data/adlasb.sqlite` (test database: `backend/data/test.sqlite`)

---

## 2. Relational Schema & Tables

### 1. `people` (Centralized Identity Registry)
Stores all individuals across the system once (applicants, representatives, respondents, witnesses, lawyers, officers).
- `id` (TEXT, PK): Unique identifier (`PER-XXXXX` or `PER-OFFICER-B1`)
- `national_id` (TEXT, UNIQUE): NID / Birth Registration / Passport
- `full_name` (TEXT, NOT NULL)
- `full_name_bn` (TEXT): Name in Bengali script
- `gender` (TEXT): `MALE`, `FEMALE`, `OTHER`, `UNKNOWN`
- `date_of_birth` (TEXT)
- `phone` (TEXT): Mobile contact
- `email` (TEXT)
- `address`, `upazila`, `district`, `division` (TEXT)
- `socio_economic_profile` (TEXT / JSON): Means test metrics, income, vulnerability markers, accessibility needs (`accessibility: { visual_impairment, interaction_mode, no_captcha_required, no_visual_otp_required }`)
- `created_at`, `updated_at` (TEXT)

### 2. `applications` (Intake Ingestion)
Records intake grievance before conversion to a formal case.
- `id` (TEXT, PK): Trace ID (`APP-YYYYMMDD-XXXX`)
- `applicant_id` (TEXT, FK -> `people.id`, RESTRICT)
- `representative_id` (TEXT, FK -> `people.id`, SET NULL)
- `category` (TEXT, NOT NULL): e.g. `FAMILY_DISPUTE`, `LAND_PROPERTY`, `GENDER_VIOLENCE`, `INDIGENOUS_RIGHTS`
- `intake_channel` (TEXT, NOT NULL): `DLAO_WALKIN`, `HELPLINE_16699`, `UDC_PORTAL`, `ONLINE_CITIZEN`, `VOICE_FIRST_INTAKE`
- `intake_office` (TEXT, NOT NULL)
- `status` (TEXT, NOT NULL): `SUBMITTED`, `UNDER_REVIEW`, `CONVERTED_TO_CASE`, `REJECTED`, `REFERRED`
- `summary` (TEXT, NOT NULL), `summary_bn` (TEXT)
- `details_json` (TEXT / JSON)
- `created_by_role` (TEXT, NOT NULL), `created_by_user_id` (TEXT)
- `created_at`, `updated_at` (TEXT)

### 3. `cases` (Core Proceedings)
The central operational dossier for legal proceedings.
- `id` (TEXT, PK): Case ID (`CASE-YYYYMMDD-XXXX`)
- `application_id` (TEXT, UNIQUE, FK -> `applications.id`, RESTRICT) — **Mandatory Golden Thread Traceability**
- `case_number` (TEXT, UNIQUE, NOT NULL): Official reference (e.g. `DLAO-DHK-2026-0042`)
- `title` (TEXT, NOT NULL), `title_bn` (TEXT)
- `category` (TEXT, NOT NULL)
- `status` (TEXT, NOT NULL, CHECK): One of 11 shared states (`NEW`, `INTAKE`, `UNDER_REVIEW`, `ASSIGNED`, `IN_PROGRESS`, `REFERRED`, `MEDIATION`, `SETTLEMENT_DRAFT`, `WAITING_FOR_ACTION`, `RESOLVED`, `CLOSED`)
- `priority` (TEXT, NOT NULL, CHECK): `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `intake_office` (TEXT, NOT NULL), `court_name` (TEXT)
- `assigned_officer_id` (TEXT), `assigned_lawyer_id` (TEXT, FK -> `people.id`)
- `filing_date` (TEXT): Case filing timestamp
- `lawyer_last_active_at` (TEXT): Lawyer activity heartbeat for accountability monitoring
- `lawyer_status` (TEXT): `ACTIVE`, `SILENT_UNRESPONSIVE` (>90 days silent alert)
- `deadline_alert_level` (TEXT): `NORMAL`, `WARNING`, `CRITICAL_OVERDUE`
- `citizen_inquiry_code` (TEXT): Non-smartphone offline status query code (IVR / USSD / UDC token)
- `details_json` (TEXT / JSON)
- `created_at`, `updated_at` (TEXT)

### 4. `safe_contacts` (Protective Routing & Survivor Safety Protocol - Flow 1)
Stores confidential contact routing when perpetrator controls the applicant's phone or credentials.
- `id` (TEXT, PK): `SC-XXXXX`
- `case_id` (TEXT, NOT NULL, FK -> `cases.id`, CASCADE)
- `person_id` (TEXT, NOT NULL, FK -> `people.id`, RESTRICT)
- `is_safe_contact_active` (INTEGER DEFAULT 1)
- `preferred_contact_method` (TEXT NOT NULL): `IN_PERSON_REPRESENTATIVE`, `ALTERNATIVE_PHONE`, `SECURE_OFFICE_VISIT`
- `unsafe_channels_json` (TEXT): JSON array of restricted channels (`PRIMARY_PHONE`, `DIRECT_SMS`, `UNSCHEDULED_HOME_VISIT`)
- `safe_channel_details` (TEXT): Encrypted/restricted instructions (e.g. "Contact ONLY through brother Ripon at 01822000102")
- `restriction_reason` (TEXT NOT NULL): Threat description (e.g. "Perpetrator husband controls phone")
- `danger_level` (TEXT NOT NULL): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `configured_by_id` (TEXT NOT NULL), `configured_by_role` (TEXT NOT NULL)
- `created_at`, `updated_at` (TEXT)

### 5. `case_people` (Participants & Legal Representation)
Relates people to cases without duplicating identity records.
- `id` (TEXT, PK)
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `person_id` (TEXT, FK -> `people.id`, RESTRICT)
- `role_in_case` (TEXT, NOT NULL, CHECK): `APPLICANT`, `AUTHORIZED_REPRESENTATIVE`, `OPPOSING_PARTY`, `WITNESS`, `VICTIM`, `PANEL_LAWYER`, `MEDIATOR`, `GUARDIAN`
- `relationship_to_applicant` (TEXT): `SELF`, `BROTHER`, `SISTER`, `SPOUSE`, `UNCLE`, etc.
- `authorization_doc_ref` (TEXT): Formal representation document (e.g. `DLAO-REP-AUTH-2026-DH-091`)
- `is_primary_contact` (INTEGER): `1` or `0`
- `notes` (TEXT)
- `created_at` (TEXT)
- `UNIQUE(case_id, person_id, role_in_case)`

### 6. `provenance_log` (Information Integrity & Source Attribution)
Maintains forensic provenance for every statement, translation, or AI output.
- `id` (TEXT, PK): `PRV-XXXXX`
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `application_id` (TEXT, FK -> `applications.id`, SET NULL)
- `entity_type` (TEXT, NOT NULL): `case`, `application`, `statement`, `evidence`
- `entity_id` (TEXT, NOT NULL)
- `field_name` (TEXT, NOT NULL): Target field (e.g. `oral_statement`, `translated_statement`)
- `source_type` (TEXT, NOT NULL, CHECK):
  - `spoken_by_person`
  - `typed_by_person`
  - `typed_by_staff`
  - `translated`
  - `ai_assisted`
  - `inferred`
  - `confirmed_by_human`
- `source_language` (TEXT), `target_language` (TEXT)
- `author_id` (TEXT), `author_role` (TEXT, NOT NULL)
- `is_secondhand_report` (INTEGER DEFAULT 0): `1` if reported on behalf of affected person
- `reported_for_person_id` (TEXT, FK -> `people.id`): Affected person identifier
- `source_details` (TEXT / JSON): Confidence, recording reference, terminal ID
- `raw_content` (TEXT): Original raw text
- `processed_content` (TEXT): Translated or processed text
- `confirmed_by` (TEXT): Human officer certifying authenticity
- `confirmed_at` (TEXT)
- `created_at` (TEXT)

### 7. `audit_log` (State Reconstruction Trail)
Append-only log of all state alterations.
- `id` (TEXT, PK): `AUD-XXXXX`
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `application_id` (TEXT, FK -> `applications.id`, SET NULL)
- `action` (TEXT, NOT NULL): e.g. `CASE_CREATED`, `STATUS_CHANGED`, `SAFE_CONTACT_CONFIGURED`, `ACCESS_DENIED`
- `actor_id` (TEXT, NOT NULL), `actor_role` (TEXT, NOT NULL)
- `payload_before`, `payload_after` (TEXT / JSON)
- `notes` (TEXT)
- `created_at` (TEXT)

### 8. `tasks` (Accountability & Follow-ups)
- `id` (TEXT, PK): `TSK-XXXXX`
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `title`, `title_bn`, `description` (TEXT)
- `assigned_to_role` (TEXT, NOT NULL), `assigned_to_user_id` (TEXT)
- `due_date` (TEXT)
- `priority` (TEXT, CHECK): `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `status` (TEXT, CHECK): `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `completed_at`, `completed_by` (TEXT)
- `created_at`, `updated_at` (TEXT)

### 9. `referrals` (Cross-District & Institutional Referrals)
- `id` (TEXT, PK): `REF-XXXXX`
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `referral_type` (TEXT): `DLAO_TO_DLAO`, `CYBER_CRIME_DIVISION`, `INTERNAL_TRANSFER`, `POLICE_FORWARDING`
- `target_authority_type` (TEXT DEFAULT 'DLAO')
- `referring_office`, `receiving_office` (TEXT, NOT NULL)
- `referring_role`, `receiving_role` (TEXT)
- `status` (TEXT): `PENDING`, `TRANSMITTED`, `ACCEPTED`, `REJECTED`, `COMPLETED`
- `acknowledgement_status` (TEXT): `UNACKNOWLEDGED`, `ACKNOWLEDGED` (Referral ownership tracking)
- `assigned_officer_id` (TEXT): External agency handling officer
- `acknowledged_at` (TEXT)
- `reason`, `reason_bn`, `notes` (TEXT)
- `transferred_at`, `accepted_at`, `created_at`, `updated_at` (TEXT)

### 10. `incident_links` (Police Coordination & Sensitive Evidence)
- `id` (TEXT, PK): `INC-XXXXX`
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `incident_type` (TEXT, NOT NULL): `DOMESTIC_VIOLENCE`, `CYBER_HARASSMENT_IMAGE_ABUSE`, `LAND_DISPUTE`
- `incident_date` (TEXT, NOT NULL), `location` (TEXT, NOT NULL)
- `description`, `description_bn` (TEXT, NOT NULL)
- `severity` (TEXT): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `is_sensitive_evidence` (INTEGER DEFAULT 0)
- `evidence_privacy_level` (TEXT): `STANDARD`, `CONFIDENTIAL`, `STRICTLY_RESTRICTED_IMAGE_ABUSE`
- `redacted_summary` (TEXT): Privacy-safe summary exposed to unauthorized roles
- `police_station_jurisdiction` (TEXT): Thana name
- `gd_or_fir_number` (TEXT): Police General Diary or FIR reference
- `linked_by_user_id` (TEXT)
- `created_at` (TEXT)

---

## 3. Database Triggers (Audit Immutability)
```sql
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
```
