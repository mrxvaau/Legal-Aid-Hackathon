# ADLASB Digital Legal Aid System — Architecture Specification

## 1. Overview & Golden Thread Architecture
The **ADLASB Digital Legal Aid System** is a unified, production-grade legal tech prototype engineered for the **ADLASB Grand Finale**. It provides a single integrated workflow rather than disconnected demos.

The architecture is anchored to the immutable **Golden Thread pipeline**:
```
Application ID (Intake)
   │
   ▼
Case ID (Dossier & Proceedings)
   ├── People / Participants (Central registry, distinct representatives)
   ├── Provenance Log (Information origin, translation, AI-assistance, human confirmation)
   ├── Audit Log (Immutable state reconstruction trail)
   ├── Permissions / Roles (7 mandatory provider roles + citizen roles)
   ├── Tasks & SLAs (Accountability, due dates, hearing compliance)
   ├── Referrals (Inter-district DLAO transfers & institutional routing)
   └── Incident Links (Multi-incident timelines, Police Thana GD/FIR links)
```

Every case derives directly from its `application_id`. Every important state-changing operation records an immutable audit event.

---

## 2. Monorepo Project Structure
```
Legal-Aid-Hackathon/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment, DB paths, server settings
│   │   ├── db/                 # SQLite connection, schema.sql, migrate.js, seed.js
│   │   ├── middleware/         # auth.js (role context & permission guard), errorHandler.js
│   │   ├── routes/             # Express routers for applications, cases, meta
│   │   ├── controllers/        # Request handling and JSON responses
│   │   ├── services/           # Core domain logic (CaseService, AuditService, ProvenanceService, etc.)
│   │   ├── repositories/       # SQLite database operations via Better-SQLite3
│   │   ├── utils/              # ID generation, constants, role and state definitions
│   │   ├── validators/         # Input validation schemas
│   │   └── app.js              # Express app configuration
│   ├── tests/
│   │   ├── api.test.js         # Automated core API, domain associations, scenario tests
│   │   └── permissions.test.js # Role-based access control and ACCESS_DENIED audit tests
│   ├── data/                   # SQLite database files (adlasb.sqlite, test.sqlite)
│   ├── package.json
│   └── server.js               # HTTP listener on port 5000
│
├── frontend/
│   ├── src/
│   │   ├── components/         # StatusBadge, ProvenanceBadge, Navbar, PeopleCard, etc.
│   │   ├── pages/              # CaseListPage, CaseDetailPage, NewApplicationPage
│   │   ├── services/           # REST API client (api.js) with role header propagation
│   │   ├── hooks/              # useRole (provider/citizen switching)
│   │   ├── i18n/               # Bilingual engine (en.json, bn.json, LanguageProvider)
│   │   ├── App.jsx             # Main container & layout
│   │   ├── index.css           # Accessible design tokens
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

## 3. Technology Stack & Rules Compliance
1. **Backend**: Node.js v22 + Express 4.
2. **Database**: SQLite with `better-sqlite3`, configured with WAL journal mode and foreign key enforcement (`PRAGMA foreign_keys = ON`).
3. **Frontend**: React 19 + Vite 6.
4. **Data Isolation**: The frontend NEVER connects to SQLite directly. All data access occurs over REST HTTP calls.
5. **UI-Agnostic Backend**: REST APIs consume and emit clean JSON with no HTML or template rendering, enabling future Flutter/React Native mobile clients to consume the exact same backend.
6. **Bilingual by Design**: English (`en`) and authentic Bangla (`bn`) implemented via react context from day one. UI text is fetched from translation resources rather than hardcoded strings.

---

## 4. Key Architectural Guarantees
- **No Silently Merged Identities**: Ripon is linked as Moyuri's authorized representative with an explicit authorization document reference (`DLAO-REP-AUTH-2026-DH-091`), maintaining distinct person IDs.
- **Provenance Integrity**: Distinguishes `spoken_by_person`, `typed_by_person`, `typed_by_staff`, `translated`, `ai_assisted`, `inferred`, and `confirmed_by_human`. AI outputs are explicitly recorded as unconfirmed until verified by human officers.
- **Accountability & Audit**: State changes (including permission rejections) generate immutable entries in `audit_log` with before/after state payloads.
