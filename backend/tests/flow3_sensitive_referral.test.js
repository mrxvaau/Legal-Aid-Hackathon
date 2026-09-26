const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

const testDbPath = path.resolve(__dirname, '../data/test-flow3.sqlite');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { seed } = require('../src/db/seed');
const { getDb } = require('../src/db/connection');

describe('Flow 3: Nabila — Sensitive Digital Harassment & Urgent Referral Tests', () => {
  before(() => {
    seed(getDb(testDbPath));
  });

  const nabilaCaseId = 'CASE-20260910-0003';
  const seededEvidenceId = 'EV-20260910-001';
  const seededReferralId = 'REF-002';
  let dynamicEvidenceId = null;
  let dynamicReferralId = null;

  it('1. Nabila seed scenario exists and is correct', async () => {
    const res = await request(app)
      .get(`/api/cases/${nabilaCaseId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const c = res.body.data;
    assert.strictEqual(c.id, nabilaCaseId);
    assert.strictEqual(c.application_id, 'APP-20260910-0003');
    assert.strictEqual(c.case_number, 'DLAO-DHK-2026-0914');
    assert.strictEqual(c.priority, 'URGENT');
    assert.strictEqual(c.status, 'REFERRED');
    assert.strictEqual(c.category, 'GENDER_VIOLENCE');
    assert.ok(c.people.some(p => p.person_id === 'PER-CITIZEN-NABILA' && p.role_in_case === 'APPLICANT'));
    assert.ok(c.incidents.some(i => i.id === 'INC-002' && i.is_sensitive_evidence === 1));
    assert.ok(c.evidence && c.evidence.length >= 2);
    assert.ok(c.referrals.some(r => r.id === seededReferralId && r.receiving_office.includes('Police Cyber Support for Women')));
  });

  it('2. Sensitive evidence can be registered into evidentiary vault', async () => {
    const payload = {
      evidence_type: 'ALTERED_IMAGE',
      title: 'Deepfake Morphing Sample Transmitted via WhatsApp',
      title_bn: 'হোয়াটসঅ্যাপে প্রেরিত বিকৃত ডিপফেক ছবি নমুনা',
      original_filename: 'deepfake_harassment_export_9914.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 3145728,
      sensitivity_level: 'STRICTLY_RESTRICTED_IMAGE_ABUSE',
      raw_content: 'SIMULATED_BINARY_IMAGE_DATA_MORPHED_EVIDENCE_FOR_TEST',
      chain_of_custody_notes: 'Uploaded by DLAO officer during intake interview. Cryptographic hash recorded.'
    };

    const res = await request(app)
      .post(`/api/cases/${nabilaCaseId}/evidence`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1')
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.id.startsWith('EV-'));
    assert.strictEqual(res.body.data.sensitivity_level, 'STRICTLY_RESTRICTED_IMAGE_ABUSE');
    assert.ok(res.body.data.hash_checksum.length === 64, 'SHA-256 checksum must be 64 hex characters');
    assert.ok(res.body.data.storage_ref.includes('vault://secure-enclave/cases/'));

    dynamicEvidenceId = res.body.data.id;
  });

  it('3. Sensitive evidence is linked to Nabila\'s case dossier', async () => {
    const res = await request(app)
      .get(`/api/cases/${nabilaCaseId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    assert.strictEqual(res.status, 200);
    const found = res.body.data.evidence.find(e => e.id === dynamicEvidenceId);
    assert.ok(found, 'Newly registered evidence must be present in case dossier');
    assert.strictEqual(found.case_id, nabilaCaseId);
    assert.strictEqual(found.sensitivity_level, 'STRICTLY_RESTRICTED_IMAGE_ABUSE');
  });

  it('4. Authorized DLAO Officer can access sensitive evidence with audited trail', async () => {
    const res = await request(app)
      .get(`/api/cases/${nabilaCaseId}/evidence/${dynamicEvidenceId}`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.id, dynamicEvidenceId);
    assert.ok(res.body.data.decrypted_prototype_preview.includes('SIMULATED SECURE VAULT ARTIFACT'));

    // Check that SENSITIVE_EVIDENCE_ACCESSED audit entry exists
    const db = getDb(testDbPath);
    const audit = db.prepare(`
      SELECT * FROM audit_log
      WHERE case_id = ? AND action = 'SENSITIVE_EVIDENCE_ACCESSED'
      ORDER BY created_at DESC LIMIT 1
    `).get(nabilaCaseId);

    assert.ok(audit, 'Audit trail must log SENSITIVE_EVIDENCE_ACCESSED');
    assert.strictEqual(audit.actor_role, 'B1_DLAO_OFFICER');
  });

  it('5. Authorized Receiving DLAO (B6) can access sensitive evidence', async () => {
    const res = await request(app)
      .get(`/api/cases/${nabilaCaseId}/evidence/${seededEvidenceId}`)
      .set('x-user-role', 'B6_RECEIVING_DLAO')
      .set('x-user-id', 'PER-RECEIVING-B6');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.id, seededEvidenceId);
  });

  it('6. Unauthorized role (B3 Helpline Agent) receives 403 Forbidden on sensitive evidence', async () => {
    const res = await request(app)
      .get(`/api/cases/${nabilaCaseId}/evidence/${seededEvidenceId}`)
      .set('x-user-role', 'B3_HELPLINE_AGENT')
      .set('x-user-id', 'PER-HELPLINE-B3');

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('lacks evidence:read_sensitive permission'));
  });

  it('7. Citizen / Nabila receives 403 Forbidden when requesting raw sensitive binary evidence directly', async () => {
    const res = await request(app)
      .get(`/api/cases/${nabilaCaseId}/evidence/${seededEvidenceId}`)
      .set('x-user-role', 'CITIZEN_APPLICANT')
      .set('x-user-id', 'PER-CITIZEN-NABILA');

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('lacks evidence:read_sensitive permission'));
  });

  it('8. Unauthorized evidence access attempt creates ACCESS_DENIED audit entry', async () => {
    const db = getDb(testDbPath);
    const deniedAudit = db.prepare(`
      SELECT * FROM audit_log
      WHERE case_id = ? AND action = 'ACCESS_DENIED'
      ORDER BY created_at DESC LIMIT 1
    `).get(nabilaCaseId);

    assert.ok(deniedAudit, 'ACCESS_DENIED audit log entry must be created upon rejection');
    assert.ok(deniedAudit.notes.includes('evidence:read_sensitive'));
  });

  it('9. Evidence list endpoint masks sensitive details for unauthorized roles', async () => {
    const res = await request(app)
      .get(`/api/cases/${nabilaCaseId}/evidence`)
      .set('x-user-role', 'B3_HELPLINE_AGENT')
      .set('x-user-id', 'PER-HELPLINE-B3');

    assert.strictEqual(res.status, 200);
    const restrictedItem = res.body.data.find(e => e.id === seededEvidenceId);
    assert.ok(restrictedItem);
    assert.strictEqual(restrictedItem.is_sensitive_restricted, true);
    assert.strictEqual(restrictedItem.hash_checksum, '[RESTRICTED — SENSITIVE_PERMISSION_REQUIRED]');
    assert.ok(restrictedItem.storage_ref.includes('RESTRICTED'));
  });

  it('10. Referral to Police Cyber Support for Women (PCSW), CID HQ can be created', async () => {
    const payload = {
      referral_type: 'CYBER_CRIME_DIVISION',
      target_authority_type: 'CYBER_CRIME_POLICE',
      referring_office: 'DLAO Dhaka Cyber Desk',
      receiving_office: 'Police Cyber Support for Women (PCSW) - CID HQ',
      reason: 'Urgent BTRC URL blocking notice and subscriber information preservation request.',
      reason_bn: 'বিটিআরসি জরুরি ইউআরএল ব্লকিং নোটিশ এবং গ্রাহক তথ্য সংরক্ষণের অনুরোধ।',
      notes: 'Digital harassment involving altered intimate photos distributed across Telegram.'
    };

    const res = await request(app)
      .post(`/api/cases/${nabilaCaseId}/referrals`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1')
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.receiving_office, 'Police Cyber Support for Women (PCSW) - CID HQ');
    assert.strictEqual(res.body.data.status, 'PENDING');
    assert.strictEqual(res.body.data.acknowledgement_status, 'UNACKNOWLEDGED');

    dynamicReferralId = res.body.data.id;
  });

  it('11. Referral has correct simulated external notice and owner display', async () => {
    const res = await request(app)
      .get(`/api/cases/${nabilaCaseId}/referrals`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .set('x-user-id', 'PER-OFFICER-B1');

    assert.strictEqual(res.status, 200);
    const ref = res.body.data.find(r => r.id === dynamicReferralId);
    assert.ok(ref);
    assert.strictEqual(ref.simulation_notice, 'External agency integration simulated for prototype.');
    assert.strictEqual(ref.owner_display, 'UNASSIGNED');
  });

  it('12. Referral acknowledgement works and is audited', async () => {
    const res = await request(app)
      .post(`/api/cases/${nabilaCaseId}/referrals/${dynamicReferralId}/acknowledge`)
      .set('x-user-role', 'B6_RECEIVING_DLAO')
      .set('x-user-id', 'OFFICER-CID-CYBER-88')
      .send({
        assigned_officer_id: 'OFFICER-CID-CYBER-88',
        notes: 'PCSW CID HQ Desk received referral and validated evidence hash.'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.acknowledgement_status, 'ACKNOWLEDGED');
    assert.strictEqual(res.body.data.assigned_officer_id, 'OFFICER-CID-CYBER-88');
    assert.strictEqual(res.body.data.owner_display, 'OFFICER-CID-CYBER-88');

    // Verify audit log
    const db = getDb(testDbPath);
    const audit = db.prepare(`
      SELECT * FROM audit_log
      WHERE case_id = ? AND action = 'REFERRAL_ACKNOWLEDGED'
      ORDER BY created_at DESC LIMIT 1
    `).get(nabilaCaseId);

    assert.ok(audit, 'Audit trail must record REFERRAL_ACKNOWLEDGED');
  });

  it('13. Ownership tracking and reassignment works', async () => {
    const res = await request(app)
      .post(`/api/cases/${nabilaCaseId}/referrals/${dynamicReferralId}/ownership`)
      .set('x-user-role', 'B6_RECEIVING_DLAO')
      .set('x-user-id', 'OFFICER-CID-CYBER-88')
      .send({
        assigned_officer_id: 'OFFICER-CID-CYBER-92',
        notes: 'Reassigned to Special Investigation Unit Cyber Cell 2'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.assigned_officer_id, 'OFFICER-CID-CYBER-92');
    assert.strictEqual(res.body.data.owner_display, 'OFFICER-CID-CYBER-92');

    // Verify audit log for REFERRAL_OWNERSHIP_ASSIGNED
    const db = getDb(testDbPath);
    const audit = db.prepare(`
      SELECT * FROM audit_log
      WHERE case_id = ? AND action = 'REFERRAL_OWNERSHIP_ASSIGNED'
      ORDER BY created_at DESC LIMIT 1
    `).get(nabilaCaseId);

    assert.ok(audit, 'Audit trail must record REFERRAL_OWNERSHIP_ASSIGNED');
    assert.ok(audit.notes.includes('OFFICER-CID-CYBER-92'));
  });

  it('14. Referral status transition lifecycle is audited', async () => {
    const res = await request(app)
      .patch(`/api/cases/${nabilaCaseId}/referrals/${dynamicReferralId}/status`)
      .set('x-user-role', 'B6_RECEIVING_DLAO')
      .set('x-user-id', 'OFFICER-CID-CYBER-92')
      .send({
        status: 'IN_PROGRESS',
        notes: 'CID Cyber Unit commenced server log analysis and contacted Telegram platform.'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'IN_PROGRESS');

    const db = getDb(testDbPath);
    const audit = db.prepare(`
      SELECT * FROM audit_log
      WHERE case_id = ? AND action = 'REFERRAL_STATUS_CHANGED'
      ORDER BY created_at DESC LIMIT 1
    `).get(nabilaCaseId);

    assert.ok(audit, 'Audit trail must record REFERRAL_STATUS_CHANGED');
  });

  it('15. Follow-up urgent task tracking works', async () => {
    // Check seeded urgent task
    const res = await request(app)
      .get(`/api/cases/${nabilaCaseId}/tasks`)
      .set('x-user-role', 'B1_DLAO_OFFICER');

    assert.strictEqual(res.status, 200);
    const task = res.body.data.find(t => t.id === 'TSK-003');
    assert.ok(task, 'Task TSK-003 must exist for Nabila case');
    assert.strictEqual(task.priority, 'URGENT');

    // Create a new coordinated follow-up task
    const taskPayload = {
      title: 'Review PCSW CID HQ Evidence Chain Acknowledgement',
      title_bn: 'পুলিশ সাইবার সাপোর্ট প্রমাণাদি প্রাপ্তি নিশ্চিতকরণ পর্যালোচনা',
      description: 'Confirm formal acknowledgement and tracking ID from PCSW CID HQ.',
      assigned_to_role: 'B1_DLAO_OFFICER',
      assigned_to_user_id: 'PER-OFFICER-B1',
      due_date: '2026-09-29',
      priority: 'URGENT'
    };

    const taskRes = await request(app)
      .post(`/api/cases/${nabilaCaseId}/tasks`)
      .set('x-user-role', 'B1_DLAO_OFFICER')
      .send(taskPayload);

    assert.strictEqual(taskRes.status, 201);
    assert.strictEqual(taskRes.body.data.priority, 'URGENT');
  });

  it('16. Audit trail immutability holds during Flow 3 events', async () => {
    const db = getDb(testDbPath);
    const latestAudit = db.prepare('SELECT id FROM audit_log ORDER BY created_at DESC LIMIT 1').get();
    assert.ok(latestAudit);

    assert.throws(() => {
      db.prepare("UPDATE audit_log SET action = 'FORGED' WHERE id = ?").run(latestAudit.id);
    }, /IMMUTABLE_VIOLATION/);

    assert.throws(() => {
      db.prepare('DELETE FROM audit_log WHERE id = ?').run(latestAudit.id);
    }, /IMMUTABLE_VIOLATION/);
  });
});
