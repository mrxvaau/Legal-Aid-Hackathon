# ADLASB Digital Legal Aid System — Roles & Permissions Matrix

## 1. Mandatory Roles

### Provider Roles (B1–B7)
| Code | Role Identifier | Title (English) | Title (Bangla) | Operational Scope |
|---|---|---|---|---|
| **B1** | `B1_DLAO_OFFICER` | DLAO Officer | ডিএলএও কর্মকর্তা | District Legal Aid Officer with administrative and judicial oversight |
| **B2** | `B2_LEGAL_AID_OFFICER` | Legal Aid Officer / Mediator | লিগ্যাল এইড অফিসার / মধ্যস্থতাকারী | Conducts ADR mediation, pre-case evaluations, and settlement drafts |
| **B3** | `B3_HELPLINE_AGENT` | 16699 Helpline Agent | ১৬৬৯৯ হেল্পলাইন এজেন্ট | Central telephony intake, preliminary advisory, and emergency referral |
| **B4** | `B4_UDC_ENTREPRENEUR` | UDC Entrepreneur | ইউডিসি উদ্যোক্তা | Union Digital Centre grassroots assisted intake, statement recording, doc upload |
| **B5** | `B5_PANEL_LAWYER` | Panel Lawyer | প্যানেল আইনজীবী | Assigned counsel conducting court hearings, filings, and monthly progress reports |
| **B6** | `B6_RECEIVING_DLAO` | Receiving DLAO | প্রাপক ডিএলএও | Officer receiving cross-district transferred cases and record extractions |
| **B7** | `B7_DLAO_ADMIN` | DLAO Admin / Support Staff | ডিএলএও অ্যাডমিন / সহকারী কর্মকর্তা | Registry management, summons issuance, task tracking, and court schedules |

### Citizen & Representative Roles
| Code | Role Identifier | Title (English) | Title (Bangla) | Operational Scope |
|---|---|---|---|---|
| **C1** | `CITIZEN_APPLICANT` | Citizen Applicant | নাগরিক আবেদনকারী | Primary applicant seeking justice |
| **C2** | `AUTHORIZED_REPRESENTATIVE` | Authorized Representative | অনুমোদিত প্রতিনিধি | Formally authorized representative (e.g. Ripon on behalf of Moyuri) |

---

## 2. Permission Registry

| Permission Key | Description |
|---|---|
| `application:create` | Submit a new intake application |
| `application:read` | Read application details |
| `application:update` | Update intake notes or eligibility assessment |
| `case:create` | Convert application into formal legal aid case |
| `case:read` | View case dossier, participants, tasks, and history |
| `case:update_status` | Advance or revert case status across the 11 shared states |
| `case:assign_lawyer` | Assign an accredited panel lawyer to a case |
| `case:mediate` | Schedule and conduct ADR mediation proceedings |
| `people:link` | Add participant (representative, respondent, witness) |
| `people:read` | View participant profiles and contact details |
| `task:create` | Create follow-up tasks and hearing SLA assignments |
| `task:update` | Update task status (e.g. mark completed) |
| `task:read` | View tasks |
| `referral:create` | Issue inter-district or institutional referral |
| `referral:accept` | Accept an inbound referral |
| `referral:read` | View referrals |
| `incident:link` | Link incident report or Thana GD/FIR |
| `incident:read` | View incidents |
| `provenance:record` | Log statement source, translation, or AI assistance |
| `provenance:confirm` | Certify translation or AI output as verified human officer |
| `provenance:read` | View provenance trail |
| `audit:read` | Inspect immutable audit logs |

---

## 3. Role-Permission Matrix

| Permission | B1 | B2 | B3 | B4 | B5 | B6 | B7 | C1 | C2 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `application:create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `application:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `application:update` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `case:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `case:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `case:update_status` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `case:assign_lawyer` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `case:mediate` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `people:link` | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `people:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `task:create` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `task:update` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `task:read` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `referral:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `referral:accept` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `referral:read` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `incident:link` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `incident:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `provenance:record` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `provenance:confirm` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `provenance:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `audit:read` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 4. Rejection Handling & Security Audit
When a request fails permission verification:
1. HTTP status `403 Forbidden` is returned with JSON:
   ```json
   {
     "success": false,
     "error": "Forbidden",
     "message": "Role 'B3_HELPLINE_AGENT' lacks required permission 'case:update_status'",
     "requiredPermission": "case:update_status",
     "currentRole": "B3_HELPLINE_AGENT"
   }
   ```
2. The system automatically inserts an `ACCESS_DENIED` entry into `audit_log` detailing actor ID, actor role, attempted permission, and associated case ID.
