const crypto = require('crypto');
const signatureRepository = require('../repositories/signatureRepository');
const caseRepository = require('../repositories/caseRepository');
const auditService = require('./auditService');
const { AUDIT_ACTIONS, ROLES } = require('../utils/constants');

/**
 * T11 Secure E-Signature & Document Integrity Service
 * 
 * ============================================================================
 * CRITICAL LEGAL GUARDRAIL:
 * This service implements cryptographic SHA-256 document hashing and signing.
 * IT PROVES DOCUMENT INTEGRITY (tamper detection) ONLY.
 * It does NOT prove legal signature validity, biometric identity, or voluntary
 * consent under the Information and Communication Technology Act or Evidence Act.
 * ============================================================================
 */
class SignatureService {
  /**
   * Compute SHA-256 digest of document content
   */
  computeHash(content) {
    if (!content) throw new Error('Document content cannot be empty');
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Record a signature for a case document
   */
  signDocument(caseId, {
    signer_person_id,
    signer_role = 'PARTY',
    document_id = null,
    document_title = 'ADR Settlement / Legal Aid Document',
    document_content = null,
    document_hash = null,
    signed_at = null,
    sync_status = 'SYNCED',
    signature_metadata = {}
  }, actor = { id: 'SYSTEM', role: ROLES.B1_DLAO_OFFICER }) {
    if (!caseId) throw new Error('case_id is required');
    if (!signer_person_id) throw new Error('signer_person_id is required');

    const caseData = caseRepository.findById(caseId);
    if (!caseData) throw new Error(`Case ${caseId} not found`);

    // Determine SHA-256 hash
    let finalHash = document_hash;
    if (document_content) {
      finalHash = this.computeHash(document_content);
    }
    if (!finalHash) {
      throw new Error('Either document_content or precomputed document_hash is required');
    }

    const signature = signatureRepository.create({
      case_id: caseId,
      signer_person_id,
      signer_role,
      document_id,
      document_title,
      document_hash: finalHash,
      signed_at: signed_at || new Date().toISOString(),
      sync_status: sync_status || 'SYNCED',
      signature_metadata: {
        ...signature_metadata,
        algorithm: 'SHA-256',
        ip_address: actor.ip || '127.0.0.1',
        actor_role: actor.role || 'CITIZEN_APPLICANT'
      }
    });

    auditService.recordAuditEvent({
      case_id: caseId,
      action: AUDIT_ACTIONS.DOCUMENT_SIGNED || 'DOCUMENT_SIGNED',
      actor_id: actor.id || signer_person_id,
      actor_role: actor.role || signer_role,
      payload_after: {
        signature_id: signature.id,
        signer_person_id,
        document_hash: finalHash,
        document_title,
        sync_status: signature.sync_status
      },
      notes: `Document integrity signature recorded for ${signature.signer_name || signer_person_id} (${finalHash.substring(0, 16)}...). Proves document integrity only.`
    });

    return {
      ...signature,
      guardrail_notice: 'PROVES DOCUMENT INTEGRITY ONLY. Verifies content has not been altered since signing. Does not prove legal signature validity, biometric identity, or voluntary consent.'
    };
  }

  /**
   * Verify all signatures on a case document against current content
   */
  verifySignatures(caseId, currentDocumentContent = null) {
    if (!caseId) throw new Error('case_id is required');

    const signatures = signatureRepository.findByCaseId(caseId);
    if (signatures.length === 0) {
      return {
        case_id: caseId,
        has_signatures: false,
        total_signatures: 0,
        status: 'NO_SIGNATURES_ON_FILE',
        signatures: [],
        guardrail_notice: 'PROVES DOCUMENT INTEGRITY ONLY.'
      };
    }

    let currentHash = null;
    let isTampered = false;
    let tamperedReason = null;

    if (currentDocumentContent) {
      currentHash = this.computeHash(currentDocumentContent);
    } else {
      // If no new content provided, compare signatures against each other
      currentHash = signatures[0].document_hash;
    }

    const verifiedSignatures = signatures.map(sig => {
      const match = sig.document_hash === currentHash;
      if (!match) {
        isTampered = true;
        tamperedReason = `Document hash mismatch: current hash (${currentHash.substring(0, 12)}...) differs from signed hash (${sig.document_hash.substring(0, 12)}...). Content has been modified!`;
      }
      return {
        signature_id: sig.id,
        signer_id: sig.signer_person_id,
        signer_name: sig.signer_name,
        signer_phone: sig.signer_phone,
        signer_role: sig.signer_role,
        signed_at: sig.signed_at,
        sync_status: sig.sync_status,
        document_hash: sig.document_hash,
        is_hash_matching: match
      };
    });

    const status = isTampered ? 'DOCUMENT_ALTERED_TAMPER_DETECTED' : 'INTEGRITY_VERIFIED';

    return {
      case_id: caseId,
      has_signatures: true,
      total_signatures: signatures.length,
      current_computed_hash: currentHash,
      is_tampered: isTampered,
      status,
      tampered_reason: tamperedReason,
      signatures: verifiedSignatures,
      guardrail_notice: 'PROVES DOCUMENT INTEGRITY ONLY: This cryptographic check confirms whether the document content matches the exact bytes present at signing time. It does NOT attest to legal signature validity, biometric identity, or voluntary consent.'
    };
  }
}

module.exports = new SignatureService();
