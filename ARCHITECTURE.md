# ADLASB Digital Legal Aid System — Architecture Specification

## 1. Overview & Golden Thread Architecture
The **ADLASB Digital Legal Aid System** is a unified digital legal aid prototype engineered for the **ADLASB Grand Finale**. It provides a single integrated workflow rather than disconnected demos.

The architecture is anchored to the immutable **Golden Thread pipeline**:
```
Application ID (Intake)
   │
   ▼
Case ID (Dossier & Proceedings)
   ├── People / Participants (Central registry, distinct representatives)
   ├── Safe Contacts (Protection protocol, restricted channels, privacy masking)
   ├── Provenance Log (Information origin, translation, AI-assistance, human confirmation)
   ├── Audit Log (Immutable state reconstruction trail)
   ├── Permissions / Roles (7 mandatory provider roles + citizen roles)
   ├── Tasks & SLAs (Accountability, due dates, hearing compliance)
   ├── Referrals (Inter-district DLAO transfers & institutional routing)
   └── Incident Links (Multi-incident timelines, Police Thana GD/FIR links)
```

Every case derives directly from its `application_id`. Every state-changing operation records an immutable audit event.

---

## 2. Monorepo Project Structure
```
Legal-Aid-Hackathon/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment, DB paths, server settings
│   │   ├── db/                 # SQLite connection, schema.sql, migrate.js, seed.js
│   │   ├── middleware/         # auth.js (prototype actor simulation & permission guard), errorHandler.js
│   │   ├── routes/             # Express routers for applications, cases, meta
│   │   ├── controllers/        # Request handling and JSON responses
│   │   ├── services/           # Domain logic (CaseService, AuditService, SafeContactService, etc.)
│   │   ├── repositories/       # SQLite database operations via Better-SQLite3
│   │   ├── utils/              # ID generation, constants, role and state definitions
│   │   ├── validators/         # Input validation schemas
│   │   └── app.js              # Express app configuration
│   ├── tests/
│   │   ├── api.test.js         # Core API, domain associations, 5 corrected scenarios, safe contact masking
│   │   └── permissions.test.js # RBAC rejections, restart persistence, audit trigger immutability
│   ├── data/                   # SQLite database files (adlasb.sqlite, test.sqlite)
│   ├── package.json
│   └── server.js               # HTTP listener on port 5000
│
├── frontend/
│   ├── src/
│   │   ├── components/         # SafeContactCard, StatusBadge, ProvenanceBadge, Navbar, PeopleCard, etc.
│   │   ├── pages/              # CaseListPage, CaseDetailPage, NewApplicationPage
│   │   ├── services/           # REST API client (api.js) with simulation header propagation
│   │   ├── hooks/              # useRole (provider/citizen switching)
│   │   ├── i18n/               # Bilingual engine (en.json, bn.json, LanguageProvider)
│   │   ├── App.jsx             # Main container & layout
│   │   ├── index.css           # Accessible design tokens & component styles
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js          # Vite configuration with /api reverse proxy
│   └── package.json
│
├── package.json                # Root orchestration scripts
├── ARCHITECTURE.md             # This document
├── API.md                      # REST API endpoints & contract
├── DATABASE.md                 # SQLite relational schema & integrity rules
├── ROLE_PERMISSIONS.md         # 7 Provider roles, permissions matrix, access control
└── TESTING.md                  # Test execution instructions & verification report
```

---

## 3. Technology Stack & Protocol Boundaries
1. **Backend**: Node.js + Express 4 REST API.
2. **Database**: SQLite with `better-sqlite3`, configured with WAL journal mode, foreign key enforcement (`PRAGMA foreign_keys = ON`), and trigger-based immutability.
3. **Frontend**: React 19 + Vite 6.
4. **Data Isolation**: The frontend NEVER connects to SQLite directly. All data mutations occur through validated backend endpoints.
5. **UI-Agnostic Backend**: REST APIs consume and emit clean JSON with no HTML or template rendering, enabling future mobile clients to consume the exact same backend.
6. **Bilingual by Design**: English (`en`) and authentic Bangla (`bn`) implemented via React Context from day one. UI text is fetched from translation resources rather than hardcoded strings.
7. **Prototype Actor Simulation**: The `x-user-role` / `x-user-id` header mechanism is explicitly labeled and isolated as a development actor simulation adapter. Authorization logic is strictly enforced by the backend and does not rely on frontend button visibility.

---

## 4. Implementation Status Matrix (T1–T11 Technical Challenges)

To maintain absolute architectural integrity, features are strictly classified as **IMPLEMENTED**, **PARTIALLY IMPLEMENTED**, **FOUNDATION ONLY**, or **NOT IMPLEMENTED**:

| ID | Technical Challenge | Status | Current Prototype Reality |
|---|---|:---:|---|
| **T1** | Voice-First & Accessible Non-Visual Pathway | **FOUNDATION ONLY** | Non-visual metadata model, CAPTCHA exemption, voice-first intake channel, audio recording reference storage in provenance. Live real-time telephony ASR/TTS speech models are not integrated. |
| **T2** | Multi-Dialect & Indigenous Language Support | **FOUNDATION ONLY** | Marma language metadata, 5-tier distinct provenance logging (spoken -> translated -> typed -> AI -> human), UDC assisted entry. Live automated audio machine translation for Marma is not integrated. |
| **T3** | Safe Contact Protection & Protective Routing | **IMPLEMENTED** | Dedicated `safe_contacts` table, danger levels, restricted channel blocking (phone/SMS/visit), unauthorized role masking (`[REDACTED FOR SAFETY]`), and audit logging. |
| **T4** | Authorized Representative & Secondhand Reporting | **IMPLEMENTED** | Distinct identity registry (Moyuri vs Ripon never merged), relationship tracking, authorization document references, and secondhand provenance attribution. |
| **T5** | Sensitive Evidence Vault & Privacy Redaction | **PARTIALLY IMPLEMENTED** | `incident_links` stores `is_sensitive_evidence`, privacy levels (`STRICTLY_RESTRICTED_IMAGE_ABUSE`), and redacted summary. Binary file vault encryption is foundation only. |
| **T6** | Lawyer Accountability & Silence Monitoring | **PARTIALLY IMPLEMENTED** | Backend tracking of lawyer silence (>90 days), `deadline_alert_level = 'CRITICAL_OVERDUE'`, and non-smartphone citizen inquiry code generation. Automated SMS/telecom notification dispatch is not implemented. |
| **T7** | Golden Thread Traceability & Case Dossier | **IMPLEMENTED** | Mandatory end-to-end link: Application ID ➔ Case ID ➔ People ➔ Safe Contact ➔ Provenance ➔ Tasks ➔ Referrals ➔ Incidents ➔ Audit Trail. |
| **T8** | Granular RBAC & Permission Enforcement | **IMPLEMENTED** | 7 Provider roles + 2 Citizen roles, backend permission middleware guarding all endpoints, state mutations strictly separated from read actions, automated ACCESS_DENIED auditing. |
| **T9** | Audit Trail Immutability | **IMPLEMENTED** | SQLite triggers `prevent_audit_log_update` and `prevent_audit_log_delete` physically prevent any mutation or deletion of historical audit logs at the database engine level. |
| **T10**| Cross-District & Institutional Referrals | **PARTIALLY IMPLEMENTED** | DLAO-to-DLAO transfers and Cyber Crime Division (Police Cyber Support for Women) referral logging with ownership and acknowledgement tracking. Automated external agency API bridges are not implemented. |
| **T11**| Non-Smartphone Citizen Status Access | **FOUNDATION ONLY** | `citizen_inquiry_code` format (`16699-MALEK-7492`) generated for non-smartphone query via IVR/USSD/UDC. Live telecom telecom SS7/USSD gateway integration is not implemented. |

---

## 5. Key Architectural Guarantees
- **No Silently Merged Identities**: Ripon is linked as Moyuri's authorized representative with an explicit authorization document reference (`DLAO-REP-AUTH-2026-DH-091`), maintaining distinct person IDs.
- **Provenance Integrity**: Distinguishes `spoken_by_person`, `typed_by_person`, `typed_by_staff`, `translated`, `ai_assisted`, `inferred`, and `confirmed_by_human`. AI outputs are explicitly recorded as unconfirmed until verified by human officers.
- **Physical Audit Immutability**: Historical audit entries cannot be modified or deleted via SQL update or delete operations without SQLite trigger rejection.
- **Authoritative Backend**: A malicious client cannot gain unauthorized access simply by modifying frontend state; all mutations are independently evaluated and enforced by the Express backend.
