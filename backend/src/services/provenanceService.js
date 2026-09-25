const provenanceRepository = require('../repositories/provenanceRepository');
const idGenerator = require('../utils/idGenerator');
const { PROVENANCE_SOURCES } = require('../utils/constants');

class ProvenanceService {
  /**
   * Record provenance information to track origin, translation, or AI assistance
   */
  recordProvenance({
    case_id = null,
    application_id = null,
    entity_type,
    entity_id,
    field_name,
    source_type,
    source_language = null,
    target_language = null,
    author_id = null,
    author_role,
    source_details = null,
    raw_content = null,
    processed_content = null,
    confirmed_by = null,
    confirmed_at = null
  }) {
    const validSources = Object.values(PROVENANCE_SOURCES);
    if (!validSources.includes(source_type)) {
      throw new Error(`Invalid provenance source_type: ${source_type}. Valid values: ${validSources.join(', ')}`);
    }

    if (!entity_type || !entity_id || !field_name || !author_role) {
      throw new Error('entity_type, entity_id, field_name, and author_role are required for provenance logging');
    }

    // Explicit confirmation rule: if source is ai_assisted or inferred, it is NOT confirmed unless confirmed_by is set
    const id = idGenerator.provenanceId();
    return provenanceRepository.create({
      id,
      case_id,
      application_id,
      entity_type,
      entity_id,
      field_name,
      source_type,
      source_language,
      target_language,
      author_id,
      author_role,
      source_details,
      raw_content,
      processed_content,
      confirmed_by,
      confirmed_at: confirmed_by && !confirmed_at ? new Date().toISOString() : confirmed_at
    });
  }

  /**
   * Human confirmation step to certify translated, staff-entered, or AI-assisted content
   */
  confirmProvenance(id, confirmedByUserId) {
    if (!confirmedByUserId) throw new Error('confirmedByUserId is required to confirm provenance');
    return provenanceRepository.confirmHuman(id, confirmedByUserId);
  }

  getProvenanceForCase(caseId) {
    return provenanceRepository.listByCaseId(caseId);
  }

  getProvenanceForEntity(entityType, entityId) {
    return provenanceRepository.listByEntity(entityType, entityId);
  }
}

module.exports = new ProvenanceService();
