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

## 2. Audited Permission Registry

| Permission Key | Description | Mutates Data | Requires Audit | Requires Provenance |
|---|---|:---:|:---:|:---:|
| `application:create` | Submit a new intake application | Yes | Yes (`APPLICATION_CREATED`) | Yes |
| `application:read` | Read application details | No | No | No |
| `application:update` | Update intake notes or eligibility assessment | Yes | Yes (`APPLICATION_UPDATED`) | Yes |
| `case:create` | Convert application into formal legal aid case | Yes | Yes (`CASE_CREATED`) | Yes |
| `case:read` | View case dossier, participants, tasks, and history | No | No | No |
| `case:update_status` | Advance or revert case status across the 11 shared states | Yes | Yes (`STATUS_CHANGE`) | Optional |
| `case:create_event` | Record a state-changing event or notice in case history | Yes | Yes (`ACTION_EVENT`) | Optional |
| `case:assign_lawyer` | Assign an accredited panel lawyer to a case | Yes | Yes (`LAWYER_ASSIGNED`) | Optional |
| `case:mediate` | Schedule and conduct ADR mediation proceedings | Yes | Yes (`MEDIATION_HEARING`) | Optional |
| `safe_contact:configure` | Configure safe contact protocol & restrict compromised channels | Yes | Yes (`SAFE_CONTACT_CONFIGURED`) | No |
| `safe_contact:read` | View unmasked confidential safe contact channel details | No | No (auto-masked if missing) | No |
| `people:link` | Add participant (representative, respondent, witness) | Yes | Yes (`REPRESENTATIVE_LINKED`) | Optional |
| `people:read` | View participant profiles and contact details | No | No | No |
| `task:create` | Create follow-up tasks and hearing SLA assignments | Yes | Yes (`TASK_CREATED`) | No |
| `task:update` | Update task status (e.g. mark completed) | Yes | Yes (`TASK_UPDATED`) | No |
| `task:read` | View tasks | No | No | No |
| `referral:create` | Issue inter-district or institutional referral | Yes | Yes (`REFERRAL_ISSUED`) | Optional |
| `referral:acknowledge`| Acknowledge institutional referral ownership (e.g. PCSW) | Yes | Yes (`REFERRAL_ACKNOWLEDGED`)| No |
| `referral:accept` | Accept an inbound transfer referral | Yes | Yes (`REFERRAL_ACCEPTED`) | Optional |
| `referral:read` | View referrals | No | No | No |
| `incident:link` | Link incident report, sensitive evidence, or Thana GD/FIR | Yes | Yes (`INCIDENT_LINKED`) | Optional |
| `incident:read` | View incidents (sensitive evidence redacted if unauthorized) | No | No | No |
| `provenance:record` | Log statement source, translation, or AI assistance | Yes | Yes (`PROVENANCE_RECORDED`)| Yes |
| `provenance:confirm` | Certify translation or AI output as verified human officer | Yes | Yes (`PROVENANCE_CONFIRMED`) | Yes |
| `provenance:read` | View provenance trail | No | No | No |
| `audit:read` | Inspect immutable audit logs | No | No | No |

---

## 3. Audited Role-Permission Matrix

| Permission | B1 | B2 | B3 | B4 | B5 | B6 | B7 | C1 | C2 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `application:create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `application:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `application:update` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `case:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `case:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `case:update_status` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `case:create_event` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `case:assign_lawyer` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `case:mediate` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `safe_contact:configure`| ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `safe_contact:read` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `people:link` | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `people:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `task:create` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `task:update` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `task:read` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `referral:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `referral:acknowledge`| ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `referral:accept` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `referral:read` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `incident:link` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `incident:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `provenance:record` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `provenance:confirm` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `provenance:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `audit:read` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 4. Development/Prototype Actor Simulation Architecture

> [!IMPORTANT]
> **DEVELOPMENT / PROTOTYPE ACTOR SIMULATION NOTICE**
> The headers `x-user-role`, `x-user-id`, and `x-user-name` are strictly used for **prototype demonstration and test actor simulation**. They are **NOT** production authentication.
> 
> - **Actor Extraction Isolation:** Actor simulation parsing is isolated inside `backend/src/middleware/auth.js` (`extractActorSimulation()`). When production authentication (e.g. OAuth2, Gov OIDC, SMS OTP) is integrated, only this isolated adapter function will be replaced; the authorization engine remains untouched.
> - **Backend Authority:** Frontend role-switcher UI does NOT determine permissions. If a client sends an unauthorized mutation (such as `POST /api/cases/:id/events` from a Helpline agent or Citizen), the backend immediately rejects the call with `403 Forbidden` and records an immutable `ACCESS_DENIED` audit entry.

---

## 5. Rejection Handling & Security Audit
When a request fails permission verification:
1. HTTP status `403 Forbidden` is returned with JSON:
   ```json
   {
     "success": false,
     "error": "Forbidden",
     "message": "Role 'B3_HELPLINE_AGENT' lacks required permission 'case:create_event'",
     "requiredPermission": "case:create_event",
     "currentRole": "B3_HELPLINE_AGENT"
   }
   ```
2. The system automatically inserts an `ACCESS_DENIED` entry into `audit_log` detailing actor ID, actor role, attempted permission, and associated case ID.
