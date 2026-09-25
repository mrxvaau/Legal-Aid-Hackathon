# ADLASB Digital Legal Aid System — Database Specification

## 1. Engine & Configuration
- **Engine**: SQLite 3 (via `better-sqlite3`)
- **Foreign Keys**: Enforced at connection time (`PRAGMA foreign_keys = ON;`)
- **Journal Mode**: Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) for high concurrency and resilience
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
- `address` (TEXT)
- `upazila` (TEXT)
- `district` (TEXT, NOT NULL)
- `division` (TEXT, NOT NULL)
- `socio_economic_profile` (TEXT / JSON): Means test metrics, income, vulnerability markers
- `created_at`, `updated_at` (TEXT)

### 2. `applications` (Intake Ingestion)
Records intake grievance before conversion to a formal case.
- `id` (TEXT, PK): Trace ID (`APP-YYYYMMDD-XXXX`)
- `applicant_id` (TEXT, FK -> `people.id`, RESTRICT)
- `representative_id` (TEXT, FK -> `people.id`, SET NULL)
- `category` (TEXT, NOT NULL): e.g. `FAMILY_DISPUTE`, `LAND_PROPERTY`, `LABOUR_DISPUTE`, `INDIGENOUS_RIGHTS`
- `intake_channel` (TEXT, NOT NULL): `DLAO_WALKIN`, `HELPLINE_16699`, `UDC_PORTAL`, `ONLINE_CITIZEN`
- `intake_office` (TEXT, NOT NULL)
- `status` (TEXT, NOT NULL): `SUBMITTED`, `UNDER_REVIEW`, `CONVERTED_TO_CASE`, `REJECTED`, `REFERRED`
- `summary` (TEXT, NOT NULL)
- `summary_bn` (TEXT)
- `details_json` (TEXT / JSON)
- `created_by_role` (TEXT, NOT NULL)
- `created_by_user_id` (TEXT)
- `created_at`, `updated_at` (TEXT)

### 3. `cases` (Core Proceedings)
The central operational dossier for legal proceedings.
- `id` (TEXT, PK): Case ID (`CASE-YYYYMMDD-XXXX`)
- `application_id` (TEXT, UNIQUE, FK -> `applications.id`, RESTRICT) — **Mandatory Golden Thread Traceability**
- `case_number` (TEXT, UNIQUE, NOT NULL): Official reference (e.g. `DLAO-DHK-2026-0042`)
- `title` (TEXT, NOT NULL)
- `title_bn` (TEXT)
- `category` (TEXT, NOT NULL)
- `status` (TEXT, NOT NULL, CHECK): One of 11 shared states (`NEW`, `INTAKE`, `UNDER_REVIEW`, `ASSIGNED`, `IN_PROGRESS`, `REFERRED`, `MEDIATION`, `SETTLEMENT_DRAFT`, `WAITING_FOR_ACTION`, `RESOLVED`, `CLOSED`)
- `priority` (TEXT, NOT NULL, CHECK): `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `intake_office` (TEXT, NOT NULL)
- `court_name` (TEXT)
- `assigned_officer_id` (TEXT)
- `assigned_lawyer_id` (TEXT, FK -> `people.id`)
- `details_json` (TEXT / JSON)
- `created_at`, `updated_at` (TEXT)

### 4. `case_people` (Participants & Legal Representation)
Relates people to cases without duplicating identity records.
- `id` (TEXT, PK)
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `person_id` (TEXT, FK -> `people.id`, RESTRICT)
- `role_in_case` (TEXT, NOT NULL, CHECK): `APPLICANT`, `AUTHORIZED_REPRESENTATIVE`, `OPPOSING_PARTY`, `WITNESS`, `VICTIM`, `PANEL_LAWYER`, `MEDIATOR`, `GUARDIAN`
- `relationship_to_applicant` (TEXT): `SELF`, `BROTHER`, `SISTER`, `SPOUSE`, `LEGAL_COUNSEL`, etc.
- `authorization_doc_ref` (TEXT): Formal representation document (e.g. `DLAO-REP-AUTH-2026-DH-091`)
- `is_primary_contact` (INTEGER): `1` or `0`
- `notes` (TEXT)
- `created_at` (TEXT)
- `UNIQUE(case_id, person_id, role_in_case)`

### 5. `provenance_log` (Information Integrity & Source Attribution)
Maintains forensic provenance for every statement, translation, or AI output.
- `id` (TEXT, PK): `PRV-XXXXX`
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `application_id` (TEXT, FK -> `applications.id`, SET NULL)
- `entity_type` (TEXT, NOT NULL): `case`, `application`, `statement`, `evidence`
- `entity_id` (TEXT, NOT NULL)
- `field_name` (TEXT, NOT NULL): Target field (e.g. `oral_statement`, `means_test_recommendation`)
- `source_type` (TEXT, NOT NULL, CHECK):
  - `spoken_by_person`
  - `typed_by_person`
  - `typed_by_staff`
  - `translated`
  - `ai_assisted`
  - `inferred`
  - `confirmed_by_human`
- `source_language` (TEXT): e.g. `marma`, `bn`, `en`
- `target_language` (TEXT)
- `author_id` (TEXT)
- `author_role` (TEXT, NOT NULL)
- `source_details` (TEXT / JSON): Model confidence, audio recording ID, translator credential
- `raw_content` (TEXT): Original unedited statement / prompt
- `processed_content` (TEXT): Translated or synthesized output
- `confirmed_by` (TEXT): Officer ID certifying human confirmation
- `confirmed_at` (TEXT): Timestamp of human confirmation
- `created_at` (TEXT)

### 6. `audit_log` (State Reconstruction Trail)
Append-only log of all state alterations.
- `id` (TEXT, PK): `AUD-XXXXX`
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `application_id` (TEXT, FK -> `applications.id`, SET NULL)
- `action` (TEXT, NOT NULL): e.g. `CASE_CREATED`, `STATUS_CHANGED`, `ACCESS_DENIED`, etc.
- `actor_id` (TEXT, NOT NULL)
- `actor_role` (TEXT, NOT NULL)
- `actor_ip` (TEXT)
- `payload_before` (TEXT / JSON): State snapshot prior to action
- `payload_after` (TEXT / JSON): State snapshot subsequent to action
- `notes` (TEXT)
- `created_at` (TEXT)

### 7. `tasks` (Accountability & Follow-ups)
- `id` (TEXT, PK): `TSK-XXXXX`
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `title`, `title_bn`, `description` (TEXT)
- `assigned_to_role` (TEXT, NOT NULL)
- `assigned_to_user_id` (TEXT)
- `due_date` (TEXT)
- `priority` (TEXT, CHECK): `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `status` (TEXT, CHECK): `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `completed_at`, `completed_by` (TEXT)
- `created_at`, `updated_at` (TEXT)

### 8. `referrals` (Cross-District Routing)
- `id` (TEXT, PK): `REF-XXXXX`
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `referral_type` (TEXT, CHECK): `DLAO_TO_DLAO`, `INTERNAL_TRANSFER`, `POLICE_FORWARDING`, `SOCIAL_SERVICES`, `NGO_LEGAL_CLINIC`, `MEDIATION_BOARD`
- `referring_office`, `receiving_office` (TEXT, NOT NULL)
- `referring_role`, `receiving_role` (TEXT)
- `status` (TEXT, CHECK): `PENDING`, `TRANSMITTED`, `ACCEPTED`, `REJECTED`, `COMPLETED`
- `reason`, `reason_bn`, `notes` (TEXT)
- `transferred_at`, `accepted_at`, `created_at`, `updated_at` (TEXT)

### 9. `incident_links` (Police Coordination & Multi-Incidents)
- `id` (TEXT, PK): `INC-XXXXX`
- `case_id` (TEXT, FK -> `cases.id`, CASCADE)
- `incident_type` (TEXT, NOT NULL): `DOMESTIC_VIOLENCE`, `WAGE_THEFT`, `HARASSMENT`, `LAND_DISPUTE`, etc.
- `incident_date` (TEXT, NOT NULL)
- `location` (TEXT, NOT NULL)
- `description`, `description_bn` (TEXT, NOT NULL)
- `severity` (TEXT, CHECK): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `police_station_jurisdiction` (TEXT): Thana name
- `gd_or_fir_number` (TEXT): Police General Diary or FIR reference
- `linked_by_user_id` (TEXT)
- `created_at` (TEXT)

### 10. `roles` & `user_roles`
Static role definitions and assigned user mappings.
