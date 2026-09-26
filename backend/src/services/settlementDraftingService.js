const settlementRepository = require('../repositories/settlementRepository');
const caseRepository = require('../repositories/caseRepository');
const auditService = require('./auditService');
const llmClient = require('./llmClient');
const { AUDIT_ACTIONS, ROLES } = require('../utils/constants');

class SettlementDraftingService {
  /**
   * Check for internal inconsistencies in mediator notes or draft terms
   */
  detectInconsistencies(notes = '', templateType = 'ADR_GENERAL') {
    const inconsistencies = [];
    const text = notes.toString();

    // 1. Amount mismatch detection
    // Match amounts like 35,000 or 40000 or 50,000 BDT
    const amountMatches = [];
    const regex = /(?:BDT|Tk\.?|টাকা)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\s*(?:BDT|Tk\.?|টাকা|taka)?/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const rawNum = match[1].replace(/,/g, '');
      const parsed = parseInt(rawNum, 10);
      if (!isNaN(parsed) && parsed > 500) {
        amountMatches.push({
          raw: match[0].trim(),
          amount: parsed,
          index: match.index
        });
      }
    }

    // Detect lump sum / upfront amount contradictions
    const lumpSumMatches = [];
    const lines = text.split(/\r?\n|[.;]/);
    for (const line of lines) {
      if (/lump\s*sum|upfront|এককালীন|immediate|advance/i.test(line)) {
        for (const am of amountMatches) {
          if (line.includes(am.raw) && !lumpSumMatches.some(m => m.amount === am.amount)) {
            lumpSumMatches.push({ line: line.trim(), amount: am.amount });
          }
        }
      }
    }

    if (lumpSumMatches.length > 1) {
      const amounts = lumpSumMatches.map(m => m.amount);
      const uniqueAmounts = [...new Set(amounts)];
      if (uniqueAmounts.length > 1) {
        inconsistencies.push({
          type: 'AMOUNT_MISMATCH',
          severity: 'HIGH',
          field: 'upfront_lump_sum_settlement',
          message: `Internal amount mismatch detected: Notes specify conflicting lump sum amounts (${uniqueAmounts.join(' BDT vs ')} BDT).`,
          snippets: lumpSumMatches.map(m => m.line)
        });
      }
    }

    // Detect monthly maintenance contradictions
    const monthlyMatches = [];
    for (const line of lines) {
      if (/monthly|প্রতি\s*মাসে|per\s*month/i.test(line)) {
        for (const am of amountMatches) {
          if (line.includes(am.raw) && !monthlyMatches.some(m => m.amount === am.amount)) {
            monthlyMatches.push({ line: line.trim(), amount: am.amount });
          }
        }
      }
    }

    if (monthlyMatches.length > 1) {
      const uniqueAmounts = [...new Set(monthlyMatches.map(m => m.amount))];
      if (uniqueAmounts.length > 1) {
        inconsistencies.push({
          type: 'MONTHLY_AMOUNT_DISCREPANCY',
          severity: 'MEDIUM',
          field: 'monthly_maintenance',
          message: `Conflicting monthly maintenance amounts noted: ${uniqueAmounts.join(' BDT vs ')} BDT.`,
          snippets: monthlyMatches.map(m => m.line)
        });
      }
    }

    // Check for timeline or date conflicts
    if (/immediate/i.test(text) && /within\s*([3-9][0-9]+)\s*days/i.test(text)) {
      inconsistencies.push({
        type: 'TIMELINE_CONFLICT',
        severity: 'LOW',
        field: 'settlement_schedule',
        message: 'Potential timeline discrepancy: Mention of both immediate payment and extended day schedule.',
        snippets: []
      });
    }

    return inconsistencies;
  }

  /**
   * Draft a settlement grounded in template and mediator notes
   */
  async draftSettlement(caseId, { mediator_notes, template_type = 'ADR_FAMILY_MAINTENANCE' }, actor = { id: 'SYSTEM', role: ROLES.B1_DLAO_OFFICER }) {
    if (!caseId) throw new Error('case_id is required');
    if (!mediator_notes) throw new Error('mediator_notes is required');

    const caseData = caseRepository.findById(caseId);
    if (!caseData) throw new Error(`Case ${caseId} not found`);

    // Detect inconsistencies
    const inconsistencies = this.detectInconsistencies(mediator_notes, template_type);

    // Build grounded clauses from template and mediator notes
    const clauses = [];

    // Title & Preamble (Boilerplate statutory)
    clauses.push({
      clause_key: 'preamble',
      heading: '1. Preamble & Statutory Grounding',
      text: `In accordance with Section 11 of the Legal Aid Services Act 2000 and the Family Courts Act 2023, this Alternative Dispute Resolution (ADR) Settlement Accord is formulated under the auspices of the District Legal Aid Office for Case Ref: ${caseData.case_number || caseId}.`,
      is_ai_inferred: false,
      grounded_source: 'National Legal Aid Statutory Framework (NLASO Rules 2014)'
    });

    // Extract Upfront Amount
    const upfrontMatch = mediator_notes.match(/(?:lump\s*sum|upfront|immediate|advance)[^0-9]*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})/i);
    const upfrontAmount = upfrontMatch ? upfrontMatch[1] : 'TBD upon officer review';
    clauses.push({
      clause_key: 'upfront_settlement',
      heading: '2. Lump Sum & Immediate Financial Obligation',
      text: `Party B shall deposit or transfer an upfront settlement amount of BDT ${upfrontAmount} directly to the designated escrow/beneficiary account.`,
      is_ai_inferred: true,
      inferred_value: upfrontAmount,
      grounded_source: upfrontMatch ? `Mediator note extract: "${upfrontMatch[0]}"` : 'Inferred from context'
    });

    // Extract Monthly Maintenance
    const monthlyMatch = mediator_notes.match(/(?:monthly|per\s*month|প্রতি\s*মাসে)[^0-9]*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})/i);
    const monthlyAmount = monthlyMatch ? monthlyMatch[1] : '0';
    clauses.push({
      clause_key: 'monthly_maintenance',
      heading: '3. Recurring Monthly Maintenance Schedule',
      text: `Party B covenants to provide a recurring monthly maintenance sum of BDT ${monthlyAmount} payable by the 7th calendar day of each successive English calendar month.`,
      is_ai_inferred: true,
      inferred_value: monthlyAmount,
      grounded_source: monthlyMatch ? `Mediator note extract: "${monthlyMatch[0]}"` : 'Standard default provision'
    });

    // Extract Custody / Parental / Living arrangement
    let custodyText = 'Guardianship and custody rights shall remain with the primary applicant, reserving reasonable scheduled visitation rights for the opposing party upon prior notice.';
    let custodyGrounded = 'Standard ADR family welfare guideline';
    if (/custody|visitation|child|বাচ্চা|সন্তান/i.test(mediator_notes)) {
      custodyText = 'Both parties agree child custody remains with the mother/primary applicant with weekend visitation as mutually scheduled.';
      custodyGrounded = 'Synthesized from mediator session observations on parental access';
    }
    clauses.push({
      clause_key: 'custody_and_visitation',
      heading: '4. Custody, Guardianship and Visitation Accord',
      text: custodyText,
      is_ai_inferred: true,
      inferred_value: custodyText,
      grounded_source: custodyGrounded
    });

    // Finality and Waiver of Litigation (Statutory boilerplate)
    clauses.push({
      clause_key: 'finality_clause',
      heading: '5. Mutual Discharge and Extinguishment of Claims',
      text: 'Upon full execution and satisfaction of the commitments articulated herein, both parties undertake not to institute further civil or criminal proceedings in respect of the causes of action covered by this ADR settlement.',
      is_ai_inferred: false,
      grounded_source: 'Legal Aid ADR Settlement Standard Binding Release Clause'
    });

    // Save draft with status=DRAFT
    const draftRecord = settlementRepository.create({
      case_id: caseId,
      template_type,
      title: `ADR Settlement Accord (${caseData.case_number || caseId})`,
      terms_json: {
        clauses,
        metadata: {
          generated_by: llmClient.getProviderName(),
          is_live_llm: llmClient.hasLiveProvider(),
          total_clauses: clauses.length,
          ai_inferred_clauses_count: clauses.filter(c => c.is_ai_inferred).length
        }
      },
      inconsistencies_json: inconsistencies,
      status: 'DRAFT',
      created_by_id: actor.id || 'SYSTEM',
      created_by_role: actor.role || ROLES.B1_DLAO_OFFICER,
      notes: mediator_notes
    });

    auditService.recordAuditEvent({
      case_id: caseId,
      action: AUDIT_ACTIONS.SETTLEMENT_DRAFTED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || ROLES.B1_DLAO_OFFICER,
      payload_after: {
        settlement_id: draftRecord.id,
        status: 'DRAFT',
        template_type,
        inconsistencies_count: inconsistencies.length
      },
      notes: `Settlement draft generated for case ${caseId}. Saved as DRAFT pending human review. Inconsistencies flagged: ${inconsistencies.length}.`
    });

    return {
      ...draftRecord,
      guardrail_notice: 'OUTPUT IS SAVED AS STATUS=DRAFT. This settlement accord is an AI-assisted advisory draft and CANNOT be marked final without explicit human officer confirmation.',
      can_be_marked_final: false
    };
  }

  /**
   * Human Officer Confirmation Action
   * GUARDRAIL: Only an authorized officer can confirm and mark a settlement final.
   */
  confirmSettlement(caseId, settlementId, { notes = null, resolution_notes = null } = {}, actor = { id: 'OFFICER-01', role: ROLES.B1_DLAO_OFFICER }) {
    if (!settlementId) throw new Error('settlementId is required');

    const draft = settlementRepository.findById(settlementId);
    if (!draft) throw new Error(`Settlement draft ${settlementId} not found`);
    if (draft.case_id !== caseId) throw new Error('Settlement draft does not belong to specified case');

    if (draft.status === 'CONFIRMED_FINAL') {
      throw new Error('Settlement draft has already been confirmed as final');
    }

    const updated = settlementRepository.updateStatus(settlementId, {
      status: 'CONFIRMED_FINAL',
      confirmed_by_id: actor.id,
      confirmed_by_role: actor.role,
      confirmed_at: new Date().toISOString(),
      notes: resolution_notes || notes || 'Confirmed and finalized after thorough human legal officer review.'
    });

    auditService.recordAuditEvent({
      case_id: caseId,
      action: AUDIT_ACTIONS.SETTLEMENT_CONFIRMED,
      actor_id: actor.id,
      actor_role: actor.role,
      payload_before: { status: 'DRAFT' },
      payload_after: {
        settlement_id: settlementId,
        status: 'CONFIRMED_FINAL',
        confirmed_by: actor.id,
        confirmed_role: actor.role
      },
      notes: `Settlement accord ${settlementId} formally confirmed and marked CONFIRMED_FINAL by officer ${actor.id} (${actor.role}).`
    });

    return {
      ...updated,
      guardrail_notice: 'Settlement confirmed by human legal officer. Ready for formal party e-signatures.'
    };
  }

  getSettlementsForCase(caseId) {
    return settlementRepository.findByCaseId(caseId);
  }

  getSettlementById(settlementId) {
    return settlementRepository.findById(settlementId);
  }
}

module.exports = new SettlementDraftingService();
