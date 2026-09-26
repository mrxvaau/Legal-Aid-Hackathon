const triageRepository = require('../repositories/triageRepository');
const caseRepository = require('../repositories/caseRepository');
const applicationRepository = require('../repositories/applicationRepository');
const auditService = require('./auditService');
const { AUDIT_ACTIONS, ROLES } = require('../utils/constants');

class TriageService {
  /**
   * Component 1: Categorization Agent (Rule-based)
   */
  categorize(text = '', existingCategory = null) {
    const t = text.toLowerCase();

    if (/ছবি|মর্ফ|ব্ল্যাকমেইল|সাইবার|photo|morphed|cyber|blackmail|whatsapp|facebook|extortion/i.test(t)) {
      return {
        category: 'CYBER_HARASSMENT',
        confidence: 0.95,
        justification: 'Identified non-consensual imagery, online extortion, or digital messaging keywords.'
      };
    }

    if (/জমি|পাহাড়|উচ্ছেদ|cht|marma|headman|karbari|ancestral|jhum/i.test(t)) {
      return {
        category: 'INDIGENOUS_LAND_RIGHTS',
        confidence: 0.92,
        justification: 'Matched Chittagong Hill Tracts customary land tenure, headman jurisdiction, or indigenous keywords.'
      };
    }

    if (/কারখানা|মজুরি|বেতন|চাকরি|factory|wages|salary|overtime|termination|worker/i.test(t)) {
      return {
        category: 'LABOUR_DISPUTE',
        confidence: 0.94,
        justification: 'Matched industrial employment, wage arrears, or termination dispute keywords.'
      };
    }

    if (/স্বামী|স্ত্রী|খোরপোশ|ডিভোর্স|সন্তান|বাচ্চা|husband|wife|maintenance|custody|nikahnama/i.test(t)) {
      return {
        category: 'FAMILY_DISPUTE',
        confidence: 0.93,
        justification: 'Matched domestic relations, maintenance, dower, or child custody keywords.'
      };
    }

    return {
      category: existingCategory || 'CIVIL_GENERAL',
      confidence: 0.75,
      justification: 'Standard civil property or contractual legal aid request.'
    };
  }

  /**
   * Component 2: Risk Assessment Agent (Rule-based)
   */
  assessRisk(text = '', category = 'CIVIL_GENERAL') {
    const t = text.toLowerCase();
    const urgentIndicators = [];

    // Critical urgent violence / life-safety flags
    if (/হত্যা|খুন|মারধর|মারপিট|শারীরিক নির্যাতন|অস্ত্র|kill|murder|death|violence|assault|beaten|weapon/i.test(t)) {
      urgentIndicators.push('Physical violence, battery, or weapon threat');
    }
    if (/আত্মহত্যা|বাচ্চা আটকে|অপহরণ|child abduction|kidnap|suicide|immediate danger/i.test(t)) {
      urgentIndicators.push('Immediate life safety or child detention hazard');
    }
    if (/ছবি বিকৃত|ইন্টারনেটে ছড়িয়ে|viral|leak intimate|revenge porn|morphed|blackmail|extortion/i.test(t)) {
      urgentIndicators.push('Imminent public dissemination of intimate digital material');
    }

    if (urgentIndicators.length > 0) {
      return {
        risk_level: 'URGENT',
        risk_score: 95,
        urgent_indicators: urgentIndicators,
        justification: `Urgent risk triggered by: ${urgentIndicators.join('; ')}.`
      };
    }

    // High risk flags
    if (/উচ্ছেদ|হুমকি|তাড়িয়ে|threat|eviction|harassment|intimidation|homeless/i.test(t)) {
      return {
        risk_level: 'HIGH',
        risk_score: 75,
        urgent_indicators: ['Forced eviction or repeated intimidation'],
        justification: 'High risk of displacement, financial destitution, or escalating threats.'
      };
    }

    // Moderate / Low
    if (category === 'FAMILY_DISPUTE' || category === 'LABOUR_DISPUTE') {
      return {
        risk_level: 'MEDIUM',
        risk_score: 50,
        urgent_indicators: [],
        justification: 'Standard bilateral civil dispute with no immediate physical threat.'
      };
    }

    return {
      risk_level: 'LOW',
      risk_score: 25,
      urgent_indicators: [],
      justification: 'Routine administrative legal inquiry.'
    };
  }

  /**
   * Component 3: Jurisdiction Routing Agent (Rule-based)
   */
  determineJurisdiction(category, riskLevel) {
    if (category === 'CYBER_HARASSMENT') {
      return {
        recommended_authority: 'Police Cyber Support for Women (PCSW) & Cyber Tribunal',
        target_role: 'CYBER_CRIME_DIVISION',
        recommended_action: 'Urgent digital takedown notice, evidence vault sealing, and referral to PCSW CID HQ.',
        justification: 'Offenses under Cyber Security Act 2023 require specialized digital forensic handling.'
      };
    }

    if (category === 'INDIGENOUS_LAND_RIGHTS') {
      return {
        recommended_authority: 'Mouza Headman Customary Bench & Joint District Judge Court',
        target_role: 'DLAO',
        recommended_action: 'Direct verification with Mouza Headman and CHT Land Commission record search.',
        justification: 'Customary tenure governance under Chittagong Hill Tracts Regulation 1900.'
      };
    }

    if (category === 'LABOUR_DISPUTE') {
      return {
        recommended_authority: 'First Labour Court & DIFE Conciliation Cell',
        target_role: 'LABOUR_COURT',
        recommended_action: 'Issue statutory mediation notice to employer with 14-day response deadline.',
        justification: 'Jurisdiction governed by Bangladesh Labour Act 2006.'
      };
    }

    if (category === 'FAMILY_DISPUTE') {
      // Note: By default, family disputes route to routine DLAO Mediation Board
      return {
        recommended_authority: 'District Legal Aid Office (DLAO) Mediation Board',
        target_role: 'MEDIATION_BOARD',
        recommended_action: 'Schedule voluntary Alternative Dispute Resolution (ADR) session with mediator.',
        justification: 'Section 11 Legal Aid Services Act 2000 ADR pre-trial conciliation track.'
      };
    }

    return {
      recommended_authority: 'District Legal Aid Office (DLAO) Registry',
      target_role: 'DLAO',
      recommended_action: 'General means testing and panel lawyer assignment.',
      justification: 'General civil legal representation under NLASO rules.'
    };
  }

  /**
   * Component 4: Document Completeness Agent (Rule-based)
   */
  evaluateCompleteness(caseData, applicationData) {
    let score = 40;
    const missing = [];
    const provided = [];

    if (applicationData?.applicant_id || caseData?.title) {
      score += 20;
      provided.push('Applicant Profile & Core Identification');
    } else {
      missing.push('National Identity Document');
    }

    if (caseData?.details_json || applicationData?.summary) {
      score += 20;
      provided.push('Factual Statement of Case');
    }

    if (caseData?.category === 'GENDER_VIOLENCE' || caseData?.category === 'CYBER_HARASSMENT') {
      missing.push('Digital Forensics Server Log / GD Receipt');
    }

    return {
      completeness_score: Math.min(100, score),
      is_ready_for_adjudication: score >= 70,
      missing_items: missing,
      provided_items: provided,
      justification: `Document completeness assessed at ${score}%. ${missing.length > 0 ? `Missing: ${missing.join(', ')}.` : 'Minimum threshold satisfied.'}`
    };
  }

  /**
   * Run full triage across all 4 components & detect conflicts
   */
  runTriage(caseId, actor = { id: 'SYSTEM', role: ROLES.B1_DLAO_OFFICER }) {
    if (!caseId) throw new Error('case_id is required');

    const caseData = caseRepository.findById(caseId);
    if (!caseData) throw new Error(`Case ${caseId} not found`);

    const applicationData = caseData.application_id ? applicationRepository.findById(caseData.application_id) : null;
    const combinedText = `${caseData.title || ''} ${caseData.details_json || ''} ${applicationData?.summary || ''}`;

    // 1. Categorization
    const catResult = this.categorize(combinedText, caseData.category);

    // 2. Risk Scoring
    const riskResult = this.assessRisk(combinedText, catResult.category);

    // 3. Jurisdiction
    const jurResult = this.determineJurisdiction(catResult.category, riskResult.risk_level);

    // 4. Completeness
    const compResult = this.evaluateCompleteness(caseData, applicationData);

    // CRITICAL REQUIREMENT: Disagreement / Conflict Detection
    // e.g. risk agent says URGENT (physical violence/life danger), but jurisdiction agent recommended routine ADR Mediation Board!
    let hasConflict = false;
    let conflictDetails = null;

    if (riskResult.risk_level === 'URGENT' && jurResult.recommended_authority.includes('Mediation Board')) {
      hasConflict = true;
      conflictDetails = {
        conflict_type: 'URGENCY_VS_ROUTINE_ADR_MISMATCH',
        severity: 'CRITICAL',
        components_involved: ['risk_agent', 'jurisdiction_agent'],
        description: 'CONFLICT DETECTED: Risk assessment flagged URGENT physical safety hazards, but standard category routing directed case to routine voluntary ADR Mediation Board. Mediation is unsafe in domestic violence situations without protective court injunctions.',
        recommendation: 'Escalate to Senior Legal Aid Officer for judicial family court referral or police emergency forwarding.'
      };
    } else if (catResult.category === 'CYBER_HARASSMENT' && !compResult.is_ready_for_adjudication) {
      hasConflict = true;
      conflictDetails = {
        conflict_type: 'EVIDENTIARY_DEFICIENCY_IN_HIGH_TECH_OFFENSE',
        severity: 'MODERATE',
        components_involved: ['categorization_agent', 'completeness_agent'],
        description: 'Cyber harassment requires verified digital chain-of-custody, but essential screenshot timestamps or GD references are currently absent.',
        recommendation: 'Dispatch immediate evidence capture task before initiating tribunal filings.'
      };
    }

    const recommendedPriority = riskResult.risk_level;
    const recommendedAuthority = jurResult.recommended_authority;
    const recommendedAction = conflictDetails ? `${jurResult.recommended_action} [WARNING: Officer review required due to detected component conflict]` : jurResult.recommended_action;

    // Save triage result
    const triageRecord = triageRepository.create({
      case_id: caseId,
      categorization_result: catResult,
      risk_result: riskResult,
      jurisdiction_result: jurResult,
      completeness_result: compResult,
      has_conflict: hasConflict ? 1 : 0,
      conflict_details: conflictDetails,
      recommended_priority: recommendedPriority,
      recommended_authority: recommendedAuthority,
      recommended_action: recommendedAction,
      final_priority: recommendedPriority,
      final_authority: recommendedAuthority,
      is_overridden: 0,
      override_reason: null,
      reviewed_by_id: null
    });

    auditService.recordAuditEvent({
      case_id: caseId,
      action: AUDIT_ACTIONS.CASE_TRIAGED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || ROLES.B1_DLAO_OFFICER,
      payload_after: {
        triage_id: triageRecord.id,
        category: catResult.category,
        priority: recommendedPriority,
        authority: recommendedAuthority,
        has_conflict: hasConflict
      },
      notes: `Automated 4-agent case triage executed. Priority: ${recommendedPriority}. Conflict detected: ${hasConflict}.`
    });

    return {
      ...triageRecord,
      guardrail_notice: 'TRIAGE ADVISORY ONLY: Recommendations do not constitute judicial or administrative disposition. Final routing and priority remain officer-reviewable and overridable.'
    };
  }

  /**
   * Human Officer Override Action
   * GUARDRAIL: Officer overrides are strictly logged in audit trail.
   */
  overrideTriage(caseId, triageId, { override_priority, override_authority, override_reason }, actor = { id: 'OFFICER-01', role: ROLES.B1_DLAO_OFFICER }) {
    if (!triageId) throw new Error('triageId is required');
    if (!override_reason) throw new Error('override_reason is mandatory for audit accountability');

    const triage = triageRepository.findById(triageId);
    if (!triage) throw new Error(`Triage record ${triageId} not found`);
    if (triage.case_id !== caseId) throw new Error('Triage record does not belong to specified case');

    const updated = triageRepository.recordOverride(triageId, {
      override_priority,
      override_authority,
      override_reason,
      reviewed_by_id: actor.id
    });

    // Update case priority if overridden
    if (override_priority) {
      caseRepository.updatePriority(caseId, override_priority);
    }

    auditService.recordAuditEvent({
      case_id: caseId,
      action: AUDIT_ACTIONS.TRIAGE_OVERRIDDEN,
      actor_id: actor.id,
      actor_role: actor.role,
      payload_before: {
        priority: triage.final_priority,
        authority: triage.final_authority
      },
      payload_after: {
        triage_id: triageId,
        priority: updated.final_priority,
        authority: updated.final_authority,
        override_reason,
        reviewed_by: actor.id
      },
      notes: `Officer override applied to triage ${triageId}. Reason: ${override_reason}. Priority updated to ${updated.final_priority}.`
    });

    return {
      ...updated,
      guardrail_notice: 'Triage recommendation overridden by authorized human officer. Logged in immutable audit trail.'
    };
  }
}

module.exports = new TriageService();
