# ADLASB Digital Legal Aid System — REST API Documentation

## Base URL
- Development / Direct: `http://localhost:5000/api`
- Frontend Vite Proxy: `/api`

## Authentication & Actor Headers
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
Returns role metadata, case state definitions, and permission matrices.

---

## 2. Applications (Intake Stage)

### `POST /api/applications`
Register a citizen application. Can pass inline applicant and representative objects or existing person IDs.
- **Required Permission**: `application:create`
- **Request Body**:
```json
{
  "applicant": {
    "full_name": "Parvin Begum",
    "full_name_bn": "পারভীন বেগম",
    "national_id": "NID-199400291011",
    "phone": "01710000000",
    "gender": "FEMALE",
    "district": "Dhaka",
    "division": "Dhaka",
    "socio_economic_profile": { "income": 9000 }
  },
  "representative": {
    "full_name": "Ripon",
    "relationship": "BROTHER",
    "auth_doc_ref": "DLAO-REP-AUTH-2026-DH-091"
  },
  "category": "FAMILY_DISPUTE",
  "intake_channel": "DLAO_WALKIN",
  "intake_office": "DLAO Dhaka",
  "summary": "Maintenance claim and domestic grievance",
  "summary_bn": "খোরপোশ ও পারিবারিক সুরক্ষা দাবি"
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
Convert an application into an active case.
- **Required Permission**: `case:create`
- **Request Body**:
```json
{
  "application_id": "APP-20260901-0001",
  "title": "Moyuri Akter vs Faruk Hossain",
  "title_bn": "ময়ূরী আক্তার বনাম ফারুক হোসেন",
  "priority": "HIGH",
  "intake_office": "DLAO Dhaka"
}
```
- **Response**: `201 Created` with case record. Automatically links the applicant and representative from the application into `case_people`.

### `GET /api/cases/:id`
Retrieve the complete integrated case dossier including:
- Linked application trace and original summary
- Participants (`people`) with distinct representative status
- Tasks & SLAs (`tasks`)
- Inter-district referrals (`referrals`)
- Linked incident reports & police references (`incidents`)
- Provenance trail (`provenance`)
- Immutable audit trail (`audit_trail`)

### `GET /api/cases`
List cases. Query parameters: `?status=MEDIATION&search=Moyuri`.

### `PATCH /api/cases/:id/status`
Update case status to one of the 11 shared states.
- **Required Permission**: `case:update_status`
- **Request Body**: `{ "status": "IN_PROGRESS", "notes": "Hearing underway" }`

---

## 4. Case People & Representatives

### `POST /api/cases/:id/people`
Link a person to the case.
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

## 5. Tasks & SLAs

### `POST /api/cases/:id/tasks`
Create an accountability follow-up task.
- **Required Permission**: `task:create`
- **Request Body**:
```json
{
  "title": "Draft Section 33 Petition",
  "title_bn": "শ্রম আইনের ৩৩ ধারা অনুযায়ী অভিযোগ খসড়া প্রস্তুত",
  "assigned_to_role": "B5_PANEL_LAWYER",
  "due_date": "2026-10-15",
  "priority": "HIGH"
}
```

### `GET /api/cases/:id/tasks`
List tasks for the case ordered by priority.

---

## 6. Referrals

### `POST /api/cases/:id/referrals`
Route case across districts or institutions. Automatically transitions case status to `REFERRED`.
- **Required Permission**: `referral:create`
- **Request Body**:
```json
{
  "referral_type": "DLAO_TO_DLAO",
  "referring_office": "DLAO Sylhet",
  "receiving_office": "DLAO Chattogram",
  "reason": "Original deeds in Chattogram record room",
  "reason_bn": "মূল দলিল চট্টগ্রাম রেকর্ড রুমে রক্ষিত"
}
```

### `POST /api/cases/:id/referrals/:referralId/accept`
Accept a referral at the receiving office.
- **Required Permission**: `referral:accept`

---

## 7. Incidents & Police Coordination

### `POST /api/cases/:id/incidents`
Link an incident report or Thana General Diary / FIR.
- **Required Permission**: `incident:link`
- **Request Body**:
```json
{
  "incident_type": "DOMESTIC_VIOLENCE",
  "incident_date": "2026-08-28",
  "location": "Mirpur, Dhaka",
  "description": "Physical assault and threat of eviction",
  "severity": "HIGH",
  "police_station_jurisdiction": "Mirpur Model Thana",
  "gd_or_fir_number": "GD-884/2026"
}
```

### `GET /api/cases/:id/incidents`
List linked incidents for the case.

---

## 8. Provenance & Audit Trail

### `POST /api/cases/:id/provenance`
Log origin, translation, or AI assistance.
- **Required Permission**: `provenance:record`
- **Request Body**:
```json
{
  "field_name": "translated_narrative",
  "source_type": "translated",
  "source_language": "marma",
  "target_language": "bn",
  "raw_content": "Original oral narrative in Marma",
  "processed_content": "Translated Bangla statement",
  "source_details": { "translator": "Minu Akhter (UDC)" }
}
```

### `POST /api/cases/:id/provenance/:provId/confirm`
Human officer confirmation of AI or translated information.
- **Required Permission**: `provenance:confirm`

### `POST /api/cases/:id/events`
Record explicit case audit event.
- **Required Permission**: `case:read`
- **Request Body**:
```json
{
  "action": "NOTICE_SERVED",
  "notes": "Formal notice served to respondent"
}
```

### `GET /api/cases/:id/events`
Retrieve immutable audit trail for the case.
