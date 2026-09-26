# ADLASB Digital Legal Aid System — REST API Documentation

## Base URL
- Development / Direct: `http://localhost:5000/api`
- Frontend Vite Proxy: `/api`

## Prototype Actor Simulation Headers

> [!NOTE]
> **DEVELOPMENT / PROTOTYPE ACTOR SIMULATION**
> The headers below are used for prototype demonstration and test actor simulation. They are **NOT** production authentication.
> The backend authorization middleware remains the sole authority. Malicious clients cannot bypass permission guards by spoofing UI state.

Every request can specify the caller's context via HTTP headers:
- `x-user-role`: The role identifier (e.g., `B1_DLAO_OFFICER`, `B3_HELPLINE_AGENT`, `CITIZEN_APPLICANT`). Defaults to `B1_DLAO_OFFICER` if omitted.
- `x-user-id`: Caller identifier (e.g., `PER-OFFICER-B1`).
- `x-user-name`: Human-readable name.
- `x-user-office`: Office jurisdiction (e.g., `DLAO Dhaka`).

---

## 1. System Metadata & Health

### `GET /api/health`
Returns system status.
```json
{
  "status": "UP",
  "timestamp": "2026-09-25T15:48:00.000Z",
  "service": "ADLASB Digital Legal Aid System API",
  "version": "1.0.0"
}
```

### `GET /api/meta`
Returns 7 provider roles, case state definitions, and permission matrices.

---

## 2. Applications (Intake Stage)

### `POST /api/applications`
Register a citizen application. Supports inline applicant and representative objects, secondhand reporting flags, and provenance attribution.
- **Required Permission**: `application:create`
- **Request Body**:
```json
{
  "applicant": {
    "full_name": "Moyuri Akter",
    "full_name_bn": "ময়ূরী আক্তার",
    "phone": "01822000101",
    "gender": "FEMALE",
    "district": "Dhaka",
    "division": "Dhaka",
    "socio_economic_profile": { "income": 8000 }
  },
  "representative": {
    "full_name": "Ripon",
    "relationship": "BROTHER",
    "auth_doc_ref": "DLAO-REP-AUTH-2026-DH-091"
  },
  "category": "FAMILY_DISPUTE",
  "intake_channel": "DLAO_WALKIN",
  "intake_office": "DLAO Dhaka",
  "summary": "Perpetrator husband controls phone; safe contact required",
  "provenance": {
    "field_name": "intake_grievance_narrative",
    "source_type": "spoken_by_person",
    "is_secondhand_report": 1,
    "reported_for_person_id": "PER-CITIZEN-MOYURI"
  }
}
```
- **Response**: `201 Created` with created application object including trace ID (`APP-YYYYMMDD-XXXX`).

### `GET /api/applications/:id`
Fetch application dossier by ID.
- **Required Permission**: `application:read`

### `GET /api/applications`
List applications with query filters: `?status=SUBMITTED&intake_office=DLAO%20Dhaka`.

---

## 3. Core Cases

### `POST /api/cases`
Convert an application into an active case. Supports optional inline `safe_contact` configuration.
- **Required Permission**: `case:create`
- **Request Body**:
```json
{
  "application_id": "APP-20260901-0001",
  "title": "Moyuri Akter vs Faruk Hossain",
  "title_bn": "ময়ূরী আক্তার বনাম ফারুক হোসেন",
  "priority": "HIGH",
  "intake_office": "DLAO Dhaka",
  "safe_contact": {
    "preferred_contact_method": "IN_PERSON_REPRESENTATIVE",
    "unsafe_channels": ["PRIMARY_PHONE", "DIRECT_SMS"],
    "safe_channel_details": "Contact brother Ripon at 01822000102. NEVER call applicant.",
    "restriction_reason": "Husband controls applicant phone and confiscated NID",
    "danger_level": "HIGH"
  }
}
```
- **Response**: `201 Created` with case record. Automatically links the applicant and representative into `case_people` without merging identities.

### `GET /api/cases/:id`
Retrieve the complete integrated case dossier including:
- Linked application trace and original summary
- Participants (`people`) with distinct representative status
- Safe contact protocols (`safe_contacts`) — automatically masked if caller lacks `safe_contact:read`
- Tasks & SLAs (`tasks`)
- Inter-district & institutional referrals (`referrals`)
- Linked incident reports & sensitive evidence (`incidents`)
- Provenance trail (`provenance`)
- Immutable audit trail (`audit_trail`)

### `GET /api/cases`
List cases. Query parameters: `?status=MEDIATION&search=Moyuri`.

### `PATCH /api/cases/:id/status`
Update case status to one of the 11 shared states.
- **Required Permission**: `case:update_status`
- **Request Body**: `{ "status": "IN_PROGRESS", "notes": "Hearing underway" }`

---

## 4. Safe Contact Protocol (Flow 1)

### `POST /api/cases/:id/safe-contact`
Configure confidential safe contact mode and restrict compromised channels.
- **Required Permission**: `safe_contact:configure`
- **Request Body**:
```json
{
  "preferred_contact_method": "IN_PERSON_REPRESENTATIVE",
  "unsafe_channels": ["PRIMARY_PHONE", "DIRECT_SMS", "UNSCHEDULED_HOME_VISIT"],
  "safe_channel_details": "Contact ONLY through brother Ripon at 01822000102.",
  "restriction_reason": "Perpetrator husband controls phone and monitors incoming messages.",
  "danger_level": "HIGH"
}
```
- **Response**: `201 Created` with configured safe contact and audit event.

### `GET /api/cases/:id/safe-contact`
List safe contacts for a case.
- **Required Permission**: `case:read`
- **Behavior**: If caller possesses `safe_contact:read`, unmasked instructions are returned. If caller lacks `safe_contact:read`, `safe_channel_details` is automatically masked with `[REDACTED: RESTRICTED CONTACT PROTOCOL ACTIVE]`.

---

## 5. Case People & Representatives

### `POST /api/cases/:id/people`
Link a participant to the case.
- **Required Permission**: `people:link`
- **Request Body**:
```json
{
  "person": {
    "full_name": "Faruk Hossain",
    "phone": "01822000103",
    "district": "Dhaka",
    "division": "Dhaka"
  },
  "role_in_case": "OPPOSING_PARTY",
  "relationship_to_applicant": "SPOUSE",
  "notes": "Respondent husband"
}
```

### `GET /api/cases/:id/people`
List participants linked to the case.

---

## 6. Tasks & SLAs

### `POST /api/cases/:id/tasks`
Create an accountability follow-up task.
- **Required Permission**: `task:create`

### `GET /api/cases/:id/tasks`
List tasks for the case ordered by priority.

---

## 7. Referrals & Escalations

### `POST /api/cases/:id/referrals`
Route case across districts or institutions. Automatically transitions case status to `REFERRED`.
- **Required Permission**: `referral:create`

### `POST /api/cases/:id/referrals/:refId/acknowledge`
Acknowledge institutional referral receipt and record assigned agency officer.
- **Required Permission**: `referral:acknowledge`
- **Request Body**: `{ "assigned_officer_id": "OFFICER-CID-CYBER-88", "notes": "Acknowledged by Cyber Crime unit" }`

### `POST /api/cases/:id/referrals/:referralId/accept`
Accept an inbound transfer referral at the receiving office.
- **Required Permission**: `referral:accept`

---

## 8. Incidents & Sensitive Evidence

### `POST /api/cases/:id/incidents`
Link an incident report, sensitive digital evidence, or Thana GD/FIR.
- **Required Permission**: `incident:link`
- **Request Body**:
```json
{
  "incident_type": "CYBER_HARASSMENT_IMAGE_ABUSE",
  "incident_date": "2026-09-09",
  "location": "Telegram Group / Online",
  "description": "Perpetrator altered explicit images from victim profile and extorted funds",
  "severity": "CRITICAL",
  "is_sensitive_evidence": 1,
  "evidence_privacy_level": "STRICTLY_RESTRICTED_IMAGE_ABUSE",
  "redacted_summary": "[RESTRICTED EVIDENCE]: 6 screenshots of blackmail messages stored in vault",
  "gd_or_fir_number": "GD-1102/2026",
  "police_station_jurisdiction": "Dhanmondi Thana"
}
```

### `GET /api/cases/:id/incidents`
List linked incidents for the case.

---

## 9. Provenance & Audit Trail

### `POST /api/cases/:id/provenance`
Log origin, translation, or AI assistance.
- **Required Permission**: `provenance:record`

### `POST /api/cases/:id/provenance/:provId/confirm`
Human officer confirmation of AI or translated information.
- **Required Permission**: `provenance:confirm`

### `POST /api/cases/:id/events`
Record a state-changing event in case history.
- **Required Permission**: `case:create_event` *(Guarded by mutation permission, NOT read-only permission)*
- **Request Body**:
```json
{
  "action": "NOTICE_SERVED",
  "notes": "Formal notice served to respondent"
}
```

### `GET /api/cases/:id/events`
Retrieve immutable audit trail for the case.
- **Required Permission**: `case:read`
