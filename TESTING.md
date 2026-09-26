# ADLASB Digital Legal Aid System — Testing Documentation

## 1. Test Suite Overview
Automated tests are implemented using the native Node.js test runner (`node:test`) and `supertest`.

The tests operate against an isolated in-memory or dedicated test database (`backend/data/test.sqlite`), guaranteeing that tests run deterministically and do not pollute production data.

---

## 2. Running Automated Tests

### Command:
```bash
# Within backend directory:
cd backend
npm test
```

---

## 3. Test Coverage Breakdown (22 Automated Tests)

### Suite 1: ADLASB Core API & Domain Model Tests (`backend/tests/api.test.js`)
- [x] **1. Health Check**: Verifies `GET /api/health` returns status `UP`.
- [x] **2. Metadata & Roles**: Verifies `GET /api/meta` returns all 7 provider roles and 11 shared case states.
- [x] **3. Application Intake**: Verifies `POST /api/applications` creates an application and centralized person entry.
- [x] **4. Application Retrieval**: Verifies `GET /api/applications/:id`.
- [x] **5. Case Creation & Traceability**: Verifies `POST /api/cases` generates a case with an immutable link to `application_id`.
- [x] **6. Representative Association**: Verifies `POST /api/cases/:id/people` links an authorized representative with distinct identity and authorization document reference.
- [x] **7. State & Audit Events**: Verifies `POST /api/cases/:id/events` records audit entries.
- [x] **8. Task Management**: Verifies `POST /api/cases/:id/tasks` creates an SLA task with priority.
- [x] **9. Referrals & Status Update**: Verifies `POST /api/cases/:id/referrals` routes across offices and updates case status to `REFERRED`.
- [x] **10. Incident Linking**: Verifies `POST /api/cases/:id/incidents` links an incident with Thana and GD/FIR numbers.
- [x] **11. Provenance & Human Confirmation**: Verifies `POST /api/cases/:id/provenance` logs AI/translation provenance and allows human officer confirmation (`POST .../confirm`).
- [x] **12. Complete Dossier Retrieval**: Verifies `GET /api/cases/:id` returns the full integrated case with people, tasks, referrals, incidents, provenance, safe contacts, and audit trail.
- [x] **13. Corrected Citizen Scenarios Verification**:
  - **Moyuri Akter & Ripon**: Safe contact active (`danger_level = 'HIGH'`), brother Ripon linked as `AUTHORIZED_REPRESENTATIVE` with `DLAO-REP-AUTH-2026-DH-091`, secondhand reporting provenance with `reported_for_person_id = 'PER-CITIZEN-MOYURI'`.
  - **Ripon**: Blind user accessibility profile (`interaction_mode: 'NON_VISUAL_VOICE_FIRST'`, `no_captcha_required: true`, `no_visual_otp_required: true`).
  - **Nabila**: Image-based cyber harassment, sensitive evidence (`is_sensitive_evidence = 1`, `evidence_privacy_level = 'STRICTLY_RESTRICTED_IMAGE_ABUSE'`), urgent referral to Police Cyber Support for Women with acknowledgement tracking (`acknowledgement_status = 'ACKNOWLEDGED'`, `assigned_officer_id = 'OFFICER-CID-CYBER-88'`).
  - **Nuching Marma**: Indigenous applicant with 5 distinct provenance stages: `spoken_by_person` (in Marma), `translated` (Marma -> Bangla), `typed_by_staff` (UDC entry), `ai_assisted` (pre-assessment), and `confirmed_by_human` (DLAO verification against Mouza Headman register) without collapsing into one field.
  - **Abdul Malek**: 7-month-old case (February 2026 filing), silent panel lawyer alert (`lawyer_status = 'SILENT_UNRESPONSIVE'`, `deadline_alert_level = 'CRITICAL_OVERDUE'`), and non-smartphone citizen inquiry code (`16699-MALEK-7492`).
- [x] **14. Safe Contact Privacy Masking**: Verifies unauthorized roles (e.g. Helpline agent) querying `GET /api/cases/:id/safe-contact` receive masked contact info (`[REDACTED: RESTRICTED CONTACT PROTOCOL ACTIVE]`).

### Suite 2: Role-Based Access Control & Permission Rejection Tests (`backend/tests/permissions.test.js`)
- [x] **1. Citizen Case Creation Rejection**: Citizen applicant denied direct case creation (403 Forbidden).
- [x] **2. Helpline Status Mutation Rejection**: Helpline agent denied case status update (403 Forbidden).
- [x] **3. Panel Lawyer Referral Rejection**: Panel lawyer denied referral creation (403 Forbidden).
- [x] **4. DLAO Officer Permitted**: DLAO Officer allowed to change status.
- [x] **5. Rejection Auditing**: Verifies that denied requests generate an `ACCESS_DENIED` entry in `audit_log`.
- [x] **6. Event Mutation Guard**: Verifies `POST /api/cases/:id/events` cannot be accessed by roles with read-only access (Helpline agent and Citizen rejected with 403 Forbidden).
- [x] **7. Multi-Role Shared Data Test Across Restart (Section 3)**:
  - Step 1: DLAO Officer (B1) creates/retrieves case.
  - Step 2: DLAO Officer adds state-changing event.
  - Step 3: Legal Aid Officer (B2) retrieves the same case.
  - Step 4: Verifies the event is visible to B2.
  - Step 5-6: Helpline Agent (B3) attempts unauthorized mutation, verified rejected with 403.
  - Step 7: Closes SQLite connection / simulates backend restart.
  - Step 8-9: Re-queries case and verifies data persists intact in SQLite.
- [x] **8. Audit Immutability Test (Section 5)**:
  - Verifies SQLite triggers `prevent_audit_log_update` and `prevent_audit_log_delete` block direct SQL UPDATE and DELETE on `audit_log`.
  - Proves audit records preserve actor ID, actor role, action, case ID, timestamp, and notes.

---

## 4. Test Execution Result
```
TAP version 13
# Subtest: ADLASB Core API & Domain Model Tests
    ok 1 - 1. GET /api/health should return system status UP
    ok 2 - 2. GET /api/meta should return 7 provider roles and 11 shared case states
    ok 3 - 3. POST /api/applications should create an application and applicant person
    ok 4 - 4. GET /api/applications/:id should retrieve the created application with audit
    ok 5 - 5. POST /api/cases should create a case linked to Application ID and auto-link applicant
    ok 6 - 6. POST /api/cases/:id/people should link authorized representative with explicit relationship
    ok 7 - 7. POST /api/cases/:id/events should record state changes and audit events
    ok 8 - 8. POST /api/cases/:id/tasks should create a trackable task
    ok 9 - 9. POST /api/cases/:id/referrals should create a referral and update case status to REFERRED
    ok 10 - 10. POST /api/cases/:id/incidents should link an incident report with Thana GD/FIR
    ok 11 - 11. POST /api/cases/:id/provenance should record AI-assisted provenance and allow human confirmation
    ok 12 - 12. GET /api/cases/:id should retrieve a complete integrated case with all associations
    ok 13 - 13. Seed Data Verification: Verify the corrected 5 mandatory citizen scenarios
    ok 14 - 14. Safe Contact Privacy Masking: Unauthorized role sees redacted contact info
ok 1 - ADLASB Core API & Domain Model Tests
# Subtest: Role-Based Access Control & Permission Rejection Tests
    ok 1 - 1. Citizen Applicant should NOT be permitted to create a case directly (403 Forbidden)
    ok 2 - 2. Helpline Agent (B3) should NOT be permitted to update case status (403 Forbidden)
    ok 3 - 3. Panel Lawyer (B5) should NOT be permitted to create new referrals (403 Forbidden)
    ok 4 - 4. DLAO Officer (B1) SHOULD be permitted to create case and change status
    ok 5 - 5. Permission rejection should generate an audit log entry for ACCESS_DENIED
    ok 6 - 6. POST /api/cases/:id/events must NOT be accessible with only read permission (403 Forbidden for Helpline/Citizen)
    ok 7 - 7. Multi-Role Shared Data & Persistence Test across Backend Restart (Section 3)
    ok 8 - 8. Audit Immutability Test (Section 5): SQLite triggers prevent UPDATE and DELETE
ok 2 - Role-Based Access Control & Permission Rejection Tests
1..2
# tests 22
# suites 2
# pass 22
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

---

## 5. Flow 1 Citizen & Representative Journey Verification

### Dedicated Pathways
1. **Citizen Portal (`/citizen` or `citizen-portal`)**:
   - Plain-language tracking by Application ID, Case ID, or Inquiry Code.
   - Non-jargon presentation of Next Actions and assigned DLAO offices.
   - Plain-language Provenance Q&A (*"Who provided this information?", "Who submitted it?", "Was it translated?", "Was it confirmed by an officer?"*).
   - Dynamic 1-click sample lookups for demo testing (Moyuri, Nabila, Nuching Marma, Abdul Malek).

2. **Authorized Representative View (`/representative` or `representative-portal`)**:
   - Dedicated interface for Ripon acting on behalf of Moyuri Akter.
   - Clear legal representation distinction: `Ripon (Authorized Representative)` representing `Moyuri Akter (Applicant)`.
   - Distinct authorization record reference: `DLAO-REP-AUTH-2026-DH-091`.
   - Ability to file secondhand follow-up statements on behalf of the applicant, appending directly to the case audit & provenance trail.

3. **Citizen Intake (`/citizen/intake` or `citizen-intake`)**:
   - Mobile-first, card-based layout without administrative clutter.
   - Zero visual CAPTCHA and zero visual OTP dependency.
   - Interactive toggles for Representative filing and Safe Contact survivor mode.
   - Instant printable/copyable receipt showing Application ID and Case ID with direct status lookup link.

### Accessibility & Voice-First Hardening
- **Universal Focus Visibility**: All interactive controls (`button`, `input`, `select`, `textarea`, `[tabindex="0"]`) feature a high-contrast 3px solid `#0F766E` focus outline with 2px offset (`:focus-visible`).
- **Touch Target Sizes**: All interactive elements comply with $\ge 44\text{px}$ minimum touch target height.
- **Screen Reader Compatibility**: Semantic HTML elements, `aria-label`, `role="region"`, `role="alert"`, and `role="status"` live regions used throughout.
- **Voice-First Distinction Explicitly Stated**: The UI prominently explains that the web pathway is voice-first compatible and non-visual (screen-reader/keyboard operable), while clearly declaring that real telephony ASR/TTS/IVR is simulated/future architecture.

### Safe Contact Protection
- The frontend never receives unmasked safe-contact details for unauthorized users.
- Citizen view displays a clear survivor reassurance: `🛡️ Safety Shield Active: Your contact safety preference is active. Direct contact to compromised phone numbers is strictly prohibited.`

### Bilingual Continuity (English $\leftrightarrow$ বাংলা)
- Full natural Bangla translations across all screens: headings, forms, error alerts, provenance questions, and buttons.
- State-preserving toggle (`🌐 বাংলা` $\leftrightarrow$ `🌐 English`).

### Responsive Viewports
- Tested across Desktop (1280px+), Tablet (768px), and Mobile (390px).
- Zero horizontal overflow; stacked form inputs and full-width touch actions on mobile viewports.

---

## 6. Flow 2: Nuching Marma & Assisted Offline-First Intake Verification

### 1. Dedicated UDC Pathway (`/udc` or `udc-portal`)
- **Assisted Context**: Dedicated grassroots interface for UDC Entrepreneur Minu Akhter assisting low-literacy indigenous citizen Nuching Marma in Baghaichhari, Rangamati.
- **Low-Bandwidth Optimization**: Lightweight UI without unnecessary media assets; operates under throttled network conditions.
- **PWA Service Worker Shell**: Caches core application shell via `/sw.js` and `manifest.json` ensuring UDC assisted intake route remains available when disconnected.

### 2. Five-Stage Provenance Chain
1. **Stage 1 (`spoken_by_person`)**: Marma oral narrative stored separately in `provenance_log` and never overwritten.
2. **Stage 2 (`translated`)**: Marma $\rightarrow$ Bangla translation by UDC Entrepreneur labeled *"UDC-assisted translation — human verification required"*.
3. **Stage 3 (`typed_by_staff`)**: Bangla record entered by UDC Entrepreneur at terminal (explicitly unconfirmed).
4. **Stage 4 (`ai_assisted`)**: Deterministic rules-engine classification (`ADLASB-RulesEngine-v1`) generating category (`INDIGENOUS_RIGHTS`), risk (`HIGH`), jurisdiction (`Joint District Judge Court & Mouza Headman Customary Bench`), and document checklist with mandatory disclaimer *"AI-assisted suggestion — human confirmation required"*.
5. **Stage 5 (`confirmed_by_human`)**: Certified by DLAO Officer against Mouza Headman customary register.

### 3. IndexedDB Offline Queue & Temporary UUIDs
- Uses client-side **IndexedDB** (`adlasb_offline_db`, store `offline_queue`).
- Generates client-side temporary UUIDs (`TEMP-UUID-xxxx`).
- Queue statuses: `PENDING_SYNC`, `SYNCING`, `SYNCED`, `CONFLICT`, `FAILED`.

### 4. Idempotent Synchronization & Idempotency Key
- Each submission includes a unique `client_request_id`.
- Replays, reconnects, or retries return the existing record (`is_idempotent_duplicate: true`) without creating duplicate applications in SQLite.

### 5. Conflict Detection & Audit Trail
- Detects conflicts if server-side data was modified while client was offline (`409 Conflict`).
- Side-by-side comparison modal displays Local vs. Server version.
- Explicit resolution actions: **Keep Local**, **Keep Server**, **Review & Merge**.
- Creates immutable audit event `OFFLINE_SYNC_CONFLICT_RESOLVED`.

### 6. Automated Test Suite (31 Tests Passing)
```bash
npm test
# tests 31
# suites 3
# pass 31
# fail 0
```
- Core API Tests: 14 passing
- Flow 2 Offline Sync Tests: 9 passing (`backend/tests/offline_sync.test.js`)
- RBAC & Immutability Tests: 8 passing
