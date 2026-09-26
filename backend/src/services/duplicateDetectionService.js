const { distance } = require('fastest-levenshtein');
const personRepository = require('../repositories/personRepository');
const taskService = require('./taskService');
const auditService = require('./auditService');
const { AUDIT_ACTIONS, ROLES } = require('../utils/constants');

class DuplicateDetectionService {
  /**
   * Calculate string similarity using Levenshtein distance
   * Returns float 0.0 to 1.0
   */
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const s1 = str1.trim().toLowerCase();
    const s2 = str2.trim().toLowerCase();
    if (s1 === s2) return 1.0;
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    const dist = distance(s1, s2);
    return Math.max(0, 1 - dist / maxLen);
  }

  /**
   * Normalize telephone number for comparison
   */
  normalizePhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9]/g, '');
    return digits.slice(-10); // match last 10 digits
  }

  /**
   * Check duplicate application/person
   * @param {Object} input - { name, phone, national_id, application_id, case_id }
   * @param {Object} actor - Authenticated user context
   * @returns {Object} Duplicate analysis with confidence score and human-review flag
   */
  checkDuplicate(input = {}, actor = { id: 'SYSTEM', role: ROLES.B1_DLAO_OFFICER }) {
    const targetName = input.name || input.full_name || '';
    const targetPhone = input.phone || '';
    const targetNid = input.national_id || input.nid || '';
    const applicationId = input.application_id || null;
    const caseId = input.case_id || null;

    if (!targetName && !targetPhone && !targetNid) {
      return {
        confidence_score: 0,
        is_duplicate_suspected: false,
        recommendation: 'INSUFFICIENT_DATA',
        matches: [],
        auto_rejected: false,
        auto_merged: false,
        guardrail: 'Never auto-reject or auto-merge. Flagged for human officer review only.'
      };
    }

    const allPeople = personRepository.list();
    const matches = [];
    let highestScore = 0;
    let trapCaseDetected = false;

    const normTargetPhone = this.normalizePhone(targetPhone);

    for (const p of allPeople) {
      // Don't compare against same person ID if updating an existing record
      if (input.person_id && p.id === input.person_id) continue;

      const nameSim = this.calculateSimilarity(targetName, p.full_name);
      const nameBnSim = this.calculateSimilarity(input.full_name_bn || '', p.full_name_bn || '');
      const effectiveNameSim = Math.max(nameSim, nameBnSim);

      const normPPhone = this.normalizePhone(p.phone);
      const phoneMatch = normTargetPhone && normPPhone && (normTargetPhone === normPPhone);

      const cleanTargetNid = targetNid ? targetNid.trim().toUpperCase() : null;
      const cleanPNid = p.national_id ? p.national_id.trim().toUpperCase() : null;
      const nidMatch = cleanTargetNid && cleanPNid && (cleanTargetNid === cleanPNid);

      // TRAP CASE DETECTION:
      // If Name is identical/very similar, BUT National IDs are explicitly provided and DIFFERENT.
      // This happens frequently with common Bangladeshi names (e.g. Moyuri Akter, Abdul Malek, Md. Hasan).
      // They are DIFFERENT citizens and must NOT be flagged as high-confidence duplicates!
      const isSameNameDifferentNid = effectiveNameSim >= 0.85 && cleanTargetNid && cleanPNid && (cleanTargetNid !== cleanPNid);

      let score = 0;
      let matchType = 'NONE';
      let details = '';

      if (nidMatch) {
        // Exact NID match is highest possible duplicate signal
        score = 98;
        matchType = 'EXACT_NID_MATCH';
        details = `Exact National ID match with ${p.full_name} (${p.national_id})`;
      } else if (isSameNameDifferentNid) {
        // Explicit trap case: Same name, but verified different National IDs
        score = Math.min(30, Math.round(effectiveNameSim * 30));
        matchType = 'TRAP_CASE_DISTINCT_PERSON_SAME_NAME';
        details = `Name similarity (${Math.round(effectiveNameSim * 100)}%), but distinct verified National IDs (${cleanTargetNid} vs ${cleanPNid}). Genuinely distinct individual.`;
        trapCaseDetected = true;
      } else if (phoneMatch && effectiveNameSim >= 0.8) {
        score = Math.round(75 + effectiveNameSim * 20); // 85 - 95
        matchType = 'EXACT_PHONE_AND_FUZZY_NAME';
        details = `Matching phone and high name similarity (${Math.round(effectiveNameSim * 100)}%) with ${p.full_name}`;
      } else if (phoneMatch) {
        score = 65;
        matchType = 'EXACT_PHONE_ONLY';
        details = `Matching phone number with ${p.full_name} (${p.phone})`;
      } else if (effectiveNameSim >= 0.85 && (!cleanTargetNid || !cleanPNid)) {
        score = Math.round(effectiveNameSim * 50); // 42 - 50
        matchType = 'HIGH_NAME_SIMILARITY_NO_NID';
        details = `High name similarity (${Math.round(effectiveNameSim * 100)}%) without conflicting NID with ${p.full_name}`;
      }

      if (score > 0) {
        matches.push({
          person_id: p.id,
          name: p.full_name,
          phone: p.phone,
          national_id: p.national_id,
          district: p.district,
          score,
          match_type: matchType,
          details
        });

        if (score > highestScore) {
          highestScore = score;
        }
      }
    }

    // Sort matches descending by score
    matches.sort((a, b) => b.score - a.score);

    // Decision rule (Guardrail: threshold is 60 for human review flag)
    const isDuplicateSuspected = highestScore >= 60;
    const recommendation = isDuplicateSuspected ? 'FLAG_FOR_HUMAN_REVIEW' : 'PROCEED';

    let createdTask = null;
    // GUARDRAIL: When flagged, create human review task. NEVER auto-reject or auto-merge!
    if (isDuplicateSuspected && (caseId || applicationId)) {
      try {
        const topMatch = matches[0];
        createdTask = taskService.createTask({
          case_id: caseId || 'APP-REVIEW',
          title: `Potential Duplicate Applicant Review (${highestScore}% match)`,
          title_bn: `সম্ভাব্য দ্বৈত আবেদন পর্যালোচনা (${highestScore}% সাদৃশ্য)`,
          description: `Duplicate check flagged applicant "${targetName}" matching existing person "${topMatch.name}" (${topMatch.person_id}) with score ${highestScore}%. Human officer verification required. Automated rejection or merge is prohibited.`,
          assigned_to_role: ROLES.B1_DLAO_OFFICER,
          assigned_to_user_id: actor.id || 'PER-OFFICER-B1',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
          priority: highestScore >= 90 ? 'URGENT' : 'HIGH',
          actor
        });
      } catch (e) {
        // Continue if task creation error
      }
    }

    // Audit log entry for decision path
    try {
      auditService.recordAuditEvent({
        case_id: caseId,
        application_id: applicationId,
        action: AUDIT_ACTIONS.DUPLICATE_CHECK_PERFORMED || 'DUPLICATE_CHECK_PERFORMED',
        actor_id: actor.id || 'SYSTEM',
        actor_role: actor.role || ROLES.B1_DLAO_OFFICER,
        payload_before: { query: { name: targetName, phone: targetPhone, national_id: targetNid } },
        payload_after: {
          confidence_score: highestScore,
          is_duplicate_suspected: isDuplicateSuspected,
          recommendation,
          auto_rejected: false,
          auto_merged: false,
          task_id: createdTask ? createdTask.id : null
        },
        notes: isDuplicateSuspected
          ? `Duplicate check flagged potential match (Score: ${highestScore}%). Flagged for human review; no auto-rejection or auto-merge.`
          : `Duplicate check completed (Score: ${highestScore}%). No duplicate flagged.`
      });
    } catch (e) {}

    return {
      confidence_score: highestScore,
      is_duplicate_suspected: isDuplicateSuspected,
      recommendation,
      matches,
      task_id: createdTask ? createdTask.id : null,
      trap_case_detected: trapCaseDetected,
      auto_rejected: false,
      auto_merged: false,
      guardrail: 'In compliance with ADLASB governance, duplicate detection provides non-binding alerts for human officer review. Automated rejection or record merging is strictly prohibited.'
    };
  }
}

module.exports = new DuplicateDetectionService();
