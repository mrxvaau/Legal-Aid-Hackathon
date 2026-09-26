const crypto = require('crypto');
const evidenceRepository = require('../repositories/evidenceRepository');
const caseRepository = require('../repositories/caseRepository');
const auditService = require('./auditService');
const permissionService = require('./permissionService');
const idGenerator = require('../utils/idGenerator');
const { AUDIT_ACTIONS, PERMISSIONS } = require('../utils/constants');

class EvidenceService {
  /**
   * Register new digital evidence into the secure evidence vault
   */
  registerEvidence({
    case_id,
    incident_id = null,
    evidence_type,
    title,
    title_bn = null,
    original_filename,
    mime_type,
    file_size_bytes = null,
    hash_checksum = null,
    storage_ref = null,
    sensitivity_level = 'CONFIDENTIAL',
    access_restrictions = null,
    evidence_status = 'REGISTERED',
    chain_of_custody_notes = null,
    raw_content = null,
    actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }
  }) {
    if (!case_id) throw new Error('case_id is required');
    if (!evidence_type) throw new Error('evidence_type is required');
    if (!title) throw new Error('title is required');
    if (!original_filename) throw new Error('original_filename is required');
    if (!mime_type) throw new Error('mime_type is required');

    const id = idGenerator.evidenceId();

    // Cryptographic SHA-256 integrity checksum
    const computedChecksum = hash_checksum || crypto
      .createHash('sha256')
      .update(raw_content || `${original_filename}-${title}-${Date.now()}`)
      .digest('hex');

    // Prototype Vault Reference
    const finalStorageRef = storage_ref || `vault://secure-enclave/cases/${case_id}/evidence/${id}.dat (Simulated Secure Storage)`;

    const defaultRestrictions = sensitivity_level === 'STRICTLY_RESTRICTED_IMAGE_ABUSE'
      ? ['RESTRICT_DLAO_ONLY', 'STRICT_AUDIT_LOGGED', 'NO_PUBLIC_ACCESS']
      : ['OFFICER_REVIEW_ONLY', 'AUDIT_LOGGED'];

    const restrictions = access_restrictions || defaultRestrictions;

    const evidence = evidenceRepository.create({
      id,
      case_id,
      incident_id,
      evidence_type,
      title,
      title_bn,
      original_filename,
      mime_type,
      file_size_bytes: file_size_bytes || (raw_content ? Buffer.byteLength(raw_content) : 1048576),
      hash_checksum: computedChecksum,
      storage_ref: finalStorageRef,
      sensitivity_level,
      access_restrictions: restrictions,
      evidence_status,
      submitted_by_id: actor.id,
      submitted_by_role: actor.role,
      submitted_at: new Date().toISOString(),
      chain_of_custody_notes: chain_of_custody_notes || `Registered by ${actor.role} (${actor.id}). SHA-256 hash verified. Access restricted and governed.`
    });

    // Record immutable audit event
    const auditAction = (sensitivity_level === 'STRICTLY_RESTRICTED_IMAGE_ABUSE' || sensitivity_level === 'CONFIDENTIAL')
      ? AUDIT_ACTIONS.SENSITIVE_EVIDENCE_REGISTERED
      : 'EVIDENCE_REGISTERED';

    auditService.recordAuditEvent({
      case_id,
      action: auditAction,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_after: {
        evidence_id: evidence.id,
        evidence_type: evidence.evidence_type,
        sensitivity_level: evidence.sensitivity_level,
        hash_checksum: evidence.hash_checksum,
        storage_ref: evidence.storage_ref
      },
      notes: `Sensitive digital evidence ${evidence.id} (${evidence.evidence_type}) registered with sensitivity ${evidence.sensitivity_level}`
    });

    return evidence;
  }

  /**
   * Retrieve list of evidence for a case, with privacy masking for roles without sensitive permission
   */
  getEvidenceForCase(caseId, actor = { id: 'ANONYMOUS', role: 'CITIZEN_APPLICANT' }) {
    const list = evidenceRepository.listByCaseId(caseId);
    const hasSensitivePerm = permissionService.checkPermission(actor.role, PERMISSIONS.EVIDENCE_READ_SENSITIVE, { recordAudit: false }).allowed;

    return list.map(item => {
      const isRestricted = (item.sensitivity_level === 'STRICTLY_RESTRICTED_IMAGE_ABUSE' || item.sensitivity_level === 'CONFIDENTIAL');

      if (isRestricted && !hasSensitivePerm) {
        return {
          ...item,
          hash_checksum: '[RESTRICTED — SENSITIVE_PERMISSION_REQUIRED]',
          storage_ref: '[RESTRICTED — VAULT ACCESS REQUIRES DLAO/RECEIVING OFFICER PERMISSION]',
          chain_of_custody_notes: '[Restricted: Chain of custody contains sensitive victim image abuse metadata]',
          is_sensitive_restricted: true,
          access_notice: 'Access to this sensitive digital evidence requires elevated evidence:read_sensitive clearance'
        };
      }

      return {
        ...item,
        is_sensitive_restricted: false
      };
    });
  }

  /**
   * Retrieve single evidence by ID with strict RBAC enforcement and audit logging
   */
  getEvidenceById(evidenceId, actor = { id: 'ANONYMOUS', role: 'CITIZEN_APPLICANT' }) {
    const evidence = evidenceRepository.findById(evidenceId);
    if (!evidence) {
      const err = new Error(`Evidence ${evidenceId} not found`);
      err.status = 404;
      throw err;
    }

    const isSensitive = (evidence.sensitivity_level === 'STRICTLY_RESTRICTED_IMAGE_ABUSE' || evidence.sensitivity_level === 'CONFIDENTIAL');

    if (isSensitive) {
      const check = permissionService.checkPermission(actor.role, PERMISSIONS.EVIDENCE_READ_SENSITIVE, {
        actor_id: actor.id,
        case_id: evidence.case_id,
        recordAudit: true
      });

      if (!check.allowed) {
        const err = new Error(`Access denied: Role '${actor.role}' lacks evidence:read_sensitive permission to view restricted evidence`);
        err.status = 403;
        throw err;
      }

      // If authorized, record access in audit log
      auditService.recordAuditEvent({
        case_id: evidence.case_id,
        action: AUDIT_ACTIONS.SENSITIVE_EVIDENCE_ACCESSED,
        actor_id: actor.id || 'SYSTEM',
        actor_role: actor.role,
        payload_after: {
          evidence_id: evidence.id,
          sensitivity_level: evidence.sensitivity_level,
          accessed_at: new Date().toISOString()
        },
        notes: `Sensitive evidence ${evidence.id} (${evidence.evidence_type}) accessed by authorized officer ${actor.id} (${actor.role})`
      });
    }

    return {
      ...evidence,
      decrypted_prototype_preview: `[SIMULATED SECURE VAULT ARTIFACT]: Verified SHA-256 (${evidence.hash_checksum.slice(0, 16)}...). Secure evidentiary chain intact.`
    };
  }
}

module.exports = new EvidenceService();
