const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Set test environment database
const testDbPath = path.resolve(__dirname, '../data/test.sqlite');
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { seed } = require('../src/db/seed');
const { getDb } = require('../src/db/connection');

describe('Flow 2: Nuching Marma & Assisted Offline-First Sync Tests', () => {
  let db;

  before(() => {
    db = getDb(testDbPath);
    seed(db);
  });

  it('1. Nuching Marma seed scenario verification in CHT Rangamati', async () => {
    const res = await request(app)
      .get('/api/cases/CASE-20260912-0004')
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(res.status, 200);
    const caseData = res.body.data;
    assert.strictEqual(caseData.application_id, 'APP-20260912-0004');
    assert.strictEqual(caseData.intake_office, 'DLAO Rangamati');
    const applicant = caseData.people.find(p => p.role_in_case === 'APPLICANT');
    assert.ok(applicant, 'Applicant person record must be linked');
    assert.ok(applicant.full_name.includes('Nuching Marma'));
  });

  it('2. Five-stage provenance chain verification for Nuching Marma', async () => {
    const res = await request(app)
      .get('/api/cases/CASE-20260912-0004')
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(res.status, 200);
    const provs = res.body.data.provenance;
    assert.ok(provs.length >= 5, 'Should contain at least 5 distinct provenance stages');

    const spoken = provs.find(p => p.source_type === 'spoken_by_person');
    const translated = provs.find(p => p.source_type === 'translated');
    const typed = provs.find(p => p.source_type === 'typed_by_staff');
    const ai = provs.find(p => p.source_type === 'ai_assisted');
    const confirmed = provs.find(p => p.source_type === 'confirmed_by_human');

    assert.ok(spoken, 'Stage 1 spoken_by_person must exist');
    assert.strictEqual(spoken.source_language, 'marma');

    assert.ok(translated, 'Stage 2 translated must exist');
    assert.strictEqual(translated.source_language, 'marma');
    assert.strictEqual(translated.target_language, 'bn');

    assert.ok(typed, 'Stage 3 typed_by_staff must exist');
    assert.strictEqual(typed.author_role, 'B4_UDC_ENTREPRENEUR');

    assert.ok(ai, 'Stage 4 ai_assisted must exist');
    assert.strictEqual(ai.confirmed_by, null, 'AI suggestion must initially be unconfirmed');

    assert.ok(confirmed, 'Stage 5 confirmed_by_human must exist');
    assert.ok(confirmed.confirmed_by, 'Must be confirmed by legal officer');
  });

  it('3. AI pre-assessment endpoint returns non-binding legal classification', async () => {
    const res = await request(app)
      .post('/api/ai-pre-assess')
      .set('x-user-role', 'B4_UDC_ENTREPRENEUR')
      .send({
        summary: 'বাঘাইছড়িতে ঐতিহ্যগত পাহাড়ি জুম ও কৃষি জমি থেকে অন্যায়ভাবে উচ্ছেদের অপচেষ্টা',
        language: 'marma'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const aiData = res.body.data;
    assert.strictEqual(aiData.suggested_category, 'INDIGENOUS_RIGHTS');
    assert.strictEqual(aiData.risk_level, 'HIGH');
    assert.ok(aiData.document_checklist.length > 0);
    assert.strictEqual(aiData.is_human_confirmed, false);
    assert.ok(aiData.disclaimer.includes('AI-assisted suggestion — human confirmation required'));
  });

  it('4. Offline record creation: UDC syncs new offline intake with client_request_id', async () => {
    const offlinePayload = {
      local_id: 'TEMP-UUID-CHT-8801',
      client_request_id: 'REQ-OFFLINE-UUID-8801',
      applicant: {
        full_name: 'Anuprue Marma',
        full_name_bn: 'অনুপ্রু মারমা',
        phone: '01899000444',
        district: 'Rangamati',
        division: 'Chittagong'
      },
      category: 'INDIGENOUS_RIGHTS',
      intake_channel: 'UDC_OFFLINE_INTAKE',
      intake_office: 'DLAO Rangamati',
      summary: 'Customary hill land dispute in Baghaichhari Union',
      summary_bn: 'বাঘাইছড়ি ইউনিয়নে ঐতিহ্যগত পাহাড়ি সীমানা বিরোধ',
      provenance: [
        {
          field_name: 'oral_statement',
          source_type: 'spoken_by_person',
          source_language: 'marma',
          raw_content: 'Original narrative in Marma'
        },
        {
          field_name: 'translated_statement',
          source_type: 'translated',
          source_language: 'marma',
          target_language: 'bn',
          raw_content: 'অনুবাদ: তিন পুরুষ ধরে বসবাস করা জমি'
        }
      ]
    };

    const res = await request(app)
      .post('/api/sync/applications')
      .set('x-user-role', 'B4_UDC_ENTREPRENEUR')
      .set('x-user-id', 'PER-UDC-B4')
      .send(offlinePayload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.synced, true);
    assert.ok(res.body.application_id.startsWith('APP-'));
    assert.strictEqual(res.body.local_id, 'TEMP-UUID-CHT-8801');
  });

  it('5. Idempotent synchronization: Resending exact client_request_id does NOT duplicate record', async () => {
    const offlinePayload = {
      local_id: 'TEMP-UUID-CHT-8801',
      client_request_id: 'REQ-OFFLINE-UUID-8801', // SAME KEY
      applicant: {
        full_name: 'Anuprue Marma',
        phone: '01899000444',
        district: 'Rangamati',
        division: 'Chittagong'
      },
      category: 'INDIGENOUS_RIGHTS',
      intake_channel: 'UDC_OFFLINE_INTAKE',
      intake_office: 'DLAO Rangamati',
      summary: 'Customary hill land dispute in Baghaichhari Union'
    };

    const countBefore = db.prepare('SELECT COUNT(*) as count FROM applications').get().count;

    const res = await request(app)
      .post('/api/sync/applications')
      .set('x-user-role', 'B4_UDC_ENTREPRENEUR')
      .set('x-user-id', 'PER-UDC-B4')
      .send(offlinePayload);

    assert.strictEqual(res.status, 200, 'Idempotent replay should return 200 OK');
    assert.strictEqual(res.body.idempotent, true);
    assert.ok(res.body.application_id);

    const countAfter = db.prepare('SELECT COUNT(*) as count FROM applications').get().count;
    assert.strictEqual(countBefore, countAfter, 'Total application count must not increase on duplicate replay');
  });

  it('6. Conflict detection: Detects when server-side application was modified while client was offline', async () => {
    // 1. Create initial application on server
    const initApp = await request(app)
      .post('/api/applications')
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .send({
        applicant: {
          full_name: 'Conflict Test Citizen',
          phone: '01711000111',
          district: 'Rangamati',
          division: 'Chittagong'
        },
        category: 'INDIGENOUS_RIGHTS',
        intake_channel: 'UDC_PORTAL',
        intake_office: 'DLAO Rangamati',
        summary: 'Server original narrative'
      });
    assert.strictEqual(initApp.status, 201);
    const appId = initApp.body.data.id;

    // 2. Server updates application (incrementing version)
    db.prepare("UPDATE applications SET summary = 'Server updated narrative by Officer', version = version + 1 WHERE id = ?").run(appId);

    // 3. Client tries to sync offline edits with outdated base_version and differing phone/district
    const res = await request(app)
      .post('/api/sync/applications')
      .set('x-user-role', 'B4_UDC_ENTREPRENEUR')
      .send({
        target_application_id: appId,
        local_id: 'TEMP-UUID-CONFLICT-01',
        base_version: 1, // OUTDATED: server is at version 2
        applicant: {
          phone: '01899999999', // CONFLICT with server phone 01711000111
          district: 'Khagrachhari' // CONFLICT with server district Rangamati
        },
        summary: 'Local offline modified narrative by UDC'
      });

    assert.strictEqual(res.status, 409, 'Must return 409 Conflict');
    assert.strictEqual(res.body.conflict, true);
    assert.ok(res.body.conflicting_fields.length > 0);
    assert.ok(res.body.server_version);
    assert.ok(res.body.local_version);
  });

  it('7. Conflict resolution: Resolving conflict applies decision and records immutable audit log', async () => {
    const appId = db.prepare("SELECT id FROM applications WHERE summary LIKE 'Server updated%'").get().id;

    const res = await request(app)
      .post('/api/sync/resolve-conflict')
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({
        application_id: appId,
        local_id: 'TEMP-UUID-CONFLICT-01',
        resolution_strategy: 'MERGE',
        merged_data: {
          phone: '01899999999',
          district: 'Rangamati',
          summary: 'Merged consensus narrative approved by Officer'
        }
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.resolution_strategy, 'MERGE');

    // Verify audit log has OFFLINE_SYNC_CONFLICT_RESOLVED
    const audit = db.prepare(`
      SELECT * FROM audit_log 
      WHERE application_id = ? AND action = 'OFFLINE_SYNC_CONFLICT_RESOLVED'
    `).get(appId);

    assert.ok(audit, 'Audit log must contain OFFLINE_SYNC_CONFLICT_RESOLVED');
    assert.strictEqual(audit.actor_role, 'B1_DLAO_OFFICER');
  });

  it('8. UDC permission restrictions: UDC cannot confirm provenance or change case status', async () => {
    // 1. Attempt to confirm provenance as UDC -> 403 Forbidden
    const provRes = await request(app)
      .post('/api/cases/CASE-20260912-0004/provenance/PRV-006/confirm')
      .set('x-user-role', 'B4_UDC_ENTREPRENEUR')
      .send({ notes: 'UDC trying to confirm' });

    assert.strictEqual(provRes.status, 403);

    // 2. Attempt to change case status as UDC -> 403 Forbidden
    const statusRes = await request(app)
      .patch('/api/cases/CASE-20260912-0004/status')
      .set('x-user-role', 'B4_UDC_ENTREPRENEUR')
      .send({ status: 'RESOLVED' });

    assert.strictEqual(statusRes.status, 403);
  });

  it('9. DLAO Confirmation: DLAO Officer can confirm provenance', async () => {
    const provRes = await request(app)
      .post('/api/cases/CASE-20260912-0004/provenance/PRV-006/confirm')
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1')
      .send({ notes: 'Certified by DLAO Officer following Mouza Headman verification' });

    assert.strictEqual(provRes.status, 200);
    assert.strictEqual(provRes.body.success, true);
    assert.strictEqual(provRes.body.data.confirmed_by, 'PER-OFFICER-B1');
  });
});
