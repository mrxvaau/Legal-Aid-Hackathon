# ADLASB Digital Legal Aid System — Testing Documentation

## 1. Test Suite Overview
Automated tests are implemented using the native Node.js test runner (`node:test`) and `supertest`.

The tests operate against an isolated in-memory or dedicated test database (`backend/data/test.sqlite`), guaranteeing that tests run deterministically and do not pollute production data.

---

## 2. Running Automated Tests

### Command:
```bash
# From repository root:
npm test

# Or within /backend directory:
cd backend
npm test
```

---

## 3. Test Coverage Breakdown

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
- [x] **12. Complete Dossier Retrieval**: Verifies `GET /api/cases/:id` returns the full integrated case with people, tasks, referrals, incidents, provenance, and audit trail.
- [x] **13. Citizen Scenarios Verification**:
  - **Moyuri Akter & Ripon**: Both distinct in `case_people`, Ripon marked as `AUTHORIZED_REPRESENTATIVE` with `DLAO-REP-AUTH-2026-DH-091`.
  - **Nabila**: Garment worker intake via Helpline 16699 with multiple linked incidents.
  - **Nuching Marma**: Indigenous citizen with oral Marma statement, UDC translation, and DLAO human confirmation.
  - **Abdul Malek**: 5+ year land dispute with Panel Lawyer assignment and cross-district referral.

### Suite 2: Role-Based Access Control & Permission Rejection Tests (`backend/tests/permissions.test.js`)
- [x] **1. Citizen Rejection**: Citizen applicant denied direct case creation (403 Forbidden).
- [x] **2. Helpline Rejection**: Helpline agent denied case status update (403 Forbidden).
- [x] **3. Panel Lawyer Rejection**: Panel lawyer denied referral creation (403 Forbidden).
- [x] **4. DLAO Officer Permitted**: DLAO Officer allowed to change status.
- [x] **5. Rejection Auditing**: Verifies that denied requests generate an `ACCESS_DENIED` entry in `audit_log`.

---

## 4. Test Execution Output
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
    ok 13 - 13. Seed Data Verification: Verify the 5 mandatory citizen scenarios
ok 1 - ADLASB Core API & Domain Model Tests
# Subtest: Role-Based Access Control & Permission Rejection Tests
    ok 1 - 1. Citizen Applicant should NOT be permitted to create a case directly (403 Forbidden)
    ok 2 - 2. Helpline Agent (B3) should NOT be permitted to update case status (403 Forbidden)
    ok 3 - 3. Panel Lawyer (B5) should NOT be permitted to create new referrals (403 Forbidden)
    ok 4 - 4. DLAO Officer (B1) SHOULD be permitted to create case and change status
    ok 5 - 5. Permission rejection should generate an audit log entry for ACCESS_DENIED
ok 2 - Role-Based Access Control & Permission Rejection Tests
1..2
# tests 18
# suites 2
# pass 18
# fail 0
```
