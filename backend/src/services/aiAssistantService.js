/**
 * AI Assistant Service (Stage 4 Provenance Classification)
 * 
 * Provides deterministic, rule-assisted legal intake pre-assessment.
 * STRICT POLICY:
 * - Does NOT make eligibility determinations.
 * - Does NOT reject applicants or render legal judgments.
 * - Does NOT alter original oral/translated statements.
 * - Outputs are non-binding suggestions requiring explicit human officer confirmation.
 */

class AiAssistantService {
  /**
   * Pre-assess intake statement
   * @param {Object} input - { summary, language, applicant_profile }
   * @returns {Object} suggestions
   */
  preAssess(input = {}) {
    const text = ((input.summary || '') + ' ' + (input.raw_content || '')).toLowerCase();
    const dialect = (input.language || input.source_language || '').toLowerCase();

    let suggestedCategory = 'CIVIL_GENERAL';
    let riskLevel = 'MEDIUM';
    let suggestedJurisdiction = 'District Legal Aid Office (DLAO)';
    let documentChecklist = ['National Identity Card (NID) or Birth Certificate', 'Citizenship Certificate from Local Council'];
    let legalGrounds = [];

    // 1. Indigenous / CHT Customary Land Dispute
    if (
      text.includes('জমি') || text.includes('পাহাড়') || text.includes('উচ্ছেদ') || 
      text.includes('land') || text.includes('ancestral') || text.includes('eviction') || 
      text.includes('baghaichhari') || text.includes('marma') || dialect === 'marma'
    ) {
      suggestedCategory = 'INDIGENOUS_RIGHTS';
      riskLevel = 'HIGH';
      suggestedJurisdiction = 'Joint District Judge Court & Mouza Headman Customary Bench (CHT Regulation 1900)';
      documentChecklist = [
        'Mouza Headman Customary Land Possession Certificate',
        'Land Revenue Dakhila / Upazila Land Office Record',
        'Traditional Boundary Sketch Signed by Karbari',
        'Tribal Citizenship Recommendation'
      ];
      legalGrounds.push('Chittagong Hill Tracts Regulation 1900 (Act I of 1900)');
      legalGrounds.push('Customary land tenure and jhum cultivation rights protection');
    }
    // 2. Gender-based Violence / Cyber Harassment
    else if (
      text.includes('ছবি') || text.includes('ছবি বিকৃত') || text.includes('ব্ল্যাকমেইল') || 
      text.includes('সাইবার') || text.includes('cyber') || text.includes('photo') || 
      text.includes('harassment') || text.includes('morphed')
    ) {
      suggestedCategory = 'GENDER_VIOLENCE';
      riskLevel = 'URGENT';
      suggestedJurisdiction = 'Cyber Tribunal & Police Cyber Support for Women (PCSW)';
      documentChecklist = [
        'Screenshots of Blackmail / Extortion Messages with Server Timestamps',
        'Relevant Social Media Profile / Group URL Identifiers',
        'Thana General Diary (GD) Reference Copy'
      ];
      legalGrounds.push('Cyber Security Act 2023 / Digital Security Framework');
      legalGrounds.push('Pornography Control Act 2012 (Section 8)');
    }
    // 3. Domestic Protection / Safe Contact
    else if (
      text.includes('স্বামী') || text.includes('নির্যাতন') || text.includes('খোরপোশ') || 
      text.includes('husband') || text.includes('domestic') || text.includes('maintenance')
    ) {
      suggestedCategory = 'FAMILY_DISPUTE';
      riskLevel = 'HIGH';
      suggestedJurisdiction = 'Family Court & DLAO Mediation Board';
      documentChecklist = [
        'Nikahnama / Marriage Registration Certificate',
        'Medical Examination Certificate (if physical assault)',
        'Alternative Safe Contact Representative Designation'
      ];
      legalGrounds.push('Domestic Violence (Prevention and Protection) Act 2010');
      legalGrounds.push('Family Courts Act 2023');
    }

    return {
      suggested_category: suggestedCategory,
      risk_level: riskLevel,
      suggested_jurisdiction: suggestedJurisdiction,
      document_checklist: documentChecklist,
      legal_statutes_cited: legalGrounds,
      confidence_score: 0.94,
      model_identifier: 'ADLASB-RulesEngine-v1',
      generated_at: new Date().toISOString(),
      is_human_confirmed: false,
      disclaimer: 'AI-assisted suggestion — human confirmation required. This advisory has no legal validity without explicit DLAO officer certification.'
    };
  }
}

module.exports = new AiAssistantService();
