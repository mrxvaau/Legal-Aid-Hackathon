const caseRepository = require('../repositories/caseRepository');
const taskRepository = require('../repositories/taskRepository');
const taskService = require('./taskService');
const auditService = require('./auditService');
const { ROLES, AUDIT_ACTIONS, PERMISSIONS } = require('../utils/constants');

const ACCOUNTABILITY_THRESHOLDS = {
  INACTIVITY_DAYS_AT_RISK: 30,
  INACTIVITY_DAYS_OVERDUE: 60,
  INACTIVITY_DAYS_ESCALATED: 90
};

class LawyerAccountabilityService {
  /**
   * Deterministic calculation of lawyer accountability metrics
   */
  calculateAccountability(caseData, tasks = []) {
    if (!caseData) return null;

    // 1. Calculate case age
    const filingDate = new Date(caseData.filing_date || caseData.created_at);
    const now = new Date();
    const elapsedDays = Math.max(0, Math.floor((now - filingDate) / (1000 * 60 * 60 * 24)));
    const elapsedMonths = Math.max(1, Math.round(elapsedDays / 30.4375));

    // 2. Check lawyer assignment
    const hasLawyer = !!caseData.assigned_lawyer_id;
    if (!hasLawyer) {
      return {
        assigned_lawyer_id: null,
        assigned_lawyer_name: null,
        case_age_months: elapsedMonths,
        case_age_display: `${elapsedMonths} months active`,
        case_age_display_bn: `প্রায় ${elapsedMonths} মাস চলমান`,
        lawyer_last_active_at: null,
        days_since_last_activity: null,
        accountability_status: 'UNASSIGNED',
        next_deadline: null,
        is_deadline_passed: false,
        days_overdue: 0,
        escalation_reason: null,
        escalation_reason_bn: null,
        operational_rule_notice: 'Accountability monitor active: deterministic operational rule, not AI judgment.'
      };
    }

    // 3. Days since last lawyer activity
    const lastActiveStr = caseData.lawyer_last_active_at || caseData.filing_date || caseData.created_at;
    const lastActiveDate = new Date(lastActiveStr);
    const daysSinceLastActivity = Math.max(0, Math.floor((now - lastActiveDate) / (1000 * 60 * 60 * 24)));

    // 4. Examine pending lawyer tasks & next deadline
    const pendingTasks = (tasks || []).filter(t => 
      t.status === 'PENDING' || t.status === 'IN_PROGRESS'
    );
    
    // Sort by due date ascending
    const tasksWithDeadline = pendingTasks
      .filter(t => t.due_date)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    const nextTask = tasksWithDeadline.length > 0 ? tasksWithDeadline[0] : null;
    let nextDeadline = nextTask ? nextTask.due_date : null;
    let isDeadlinePassed = false;
    let daysOverdue = 0;

    if (nextDeadline) {
      const deadlineDate = new Date(nextDeadline);
      if (deadlineDate < now) {
        isDeadlinePassed = true;
        daysOverdue = Math.max(1, Math.floor((now - deadlineDate) / (1000 * 60 * 60 * 24)));
      }
    }

    // 5. Determine deterministic accountability status
    let accountabilityStatus = 'ACTIVE';
    if (
      caseData.lawyer_status === 'SILENT_UNRESPONSIVE' ||
      caseData.lawyer_status === 'WARNED' ||
      caseData.lawyer_status === 'ESCALATED' ||
      caseData.deadline_alert_level === 'CRITICAL_OVERDUE' ||
      daysSinceLastActivity >= ACCOUNTABILITY_THRESHOLDS.INACTIVITY_DAYS_ESCALATED
    ) {
      accountabilityStatus = 'ESCALATED';
    } else if (
      isDeadlinePassed || 
      daysSinceLastActivity >= ACCOUNTABILITY_THRESHOLDS.INACTIVITY_DAYS_OVERDUE ||
      caseData.lawyer_status === 'OVERDUE'
    ) {
      accountabilityStatus = 'OVERDUE';
    } else if (
      daysSinceLastActivity >= ACCOUNTABILITY_THRESHOLDS.INACTIVITY_DAYS_AT_RISK ||
      caseData.deadline_alert_level === 'WARNING_APPROACHING' ||
      caseData.lawyer_status === 'AT_RISK'
    ) {
      accountabilityStatus = 'AT_RISK';
    }

    // 6. Generate factual, objective explanation (no inflammatory language)
    let escalationReason = null;
    let escalationReasonBn = null;

    if (accountabilityStatus === 'ESCALATED' || accountabilityStatus === 'OVERDUE') {
      const deadlineInfo = nextDeadline 
        ? ` and statutory action deadline passed on ${nextDeadline.substring(0, 10)} (${daysOverdue} days overdue)`
        : '';
      const deadlineInfoBn = nextDeadline
        ? ` এবং নির্ধারিত সময়সীমা ${nextDeadline.substring(0, 10)} তারিখে (${daysOverdue} দিন পূর্বে) অতিবাহিত হয়েছে`
        : '';

      escalationReason = `Assigned lawyer has had no recorded activity for ${daysSinceLastActivity} days (since ${lastActiveStr.substring(0, 10)})${deadlineInfo}. Formal DLAO accountability review required.`;
      escalationReasonBn = `নিয়োগকৃত আইনজীবী ${lastActiveStr.substring(0, 10)} থেকে (${daysSinceLastActivity} দিন ধরে) কোনো কার্যক্রম রেকর্ড করেননি${deadlineInfoBn}। জেলা লিগ্যাল এইড অফিসের জবাবদিহিতা পর্যালোচনা প্রয়োজন।`;
    } else if (accountabilityStatus === 'AT_RISK') {
      escalationReason = `Assigned lawyer has had no activity recorded for ${daysSinceLastActivity} days. Monitoring approaching deadline.`;
      escalationReasonBn = `নিয়োগকৃত আইনজীবীর ${daysSinceLastActivity} দিন ধরে কোনো অগ্রগতি রেকর্ড নেই। সম্ভাব্য সময়সীমা পর্যবেক্ষণ করা হচ্ছে।`;
    }

    return {
      assigned_lawyer_id: caseData.assigned_lawyer_id,
      assigned_lawyer_name: caseData.assigned_lawyer_name || null,
      case_age_months: elapsedMonths,
      case_age_display: `${elapsedMonths} months active`,
      case_age_display_bn: `প্রায় ${elapsedMonths} মাস চলমান`,
      lawyer_last_active_at: caseData.lawyer_last_active_at,
      days_since_last_activity: daysSinceLastActivity,
      accountability_status: accountabilityStatus,
      next_deadline: nextDeadline,
      is_deadline_passed: isDeadlinePassed,
      days_overdue: daysOverdue,
      escalation_reason: escalationReason,
      escalation_reason_bn: escalationReasonBn,
      thresholds: ACCOUNTABILITY_THRESHOLDS,
      operational_rule_notice: 'Accountability status is an operational factual calculation based on statutory timeline thresholds, not subjective evaluation.'
    };
  }

  /**
   * Record lawyer activity / progress report
   */
  recordActivity(caseId, activityData, actor) {
    const caseData = caseRepository.findById(caseId);
    if (!caseData) throw new Error(`Case ${caseId} not found`);

    // Verify actor is assigned lawyer or authorized DLAO officer
    if (actor.role === ROLES.B5_PANEL_LAWYER && caseData.assigned_lawyer_id && caseData.assigned_lawyer_id !== actor.id) {
      const err = new Error("Panel Lawyer can only record activity on their assigned cases");
      err.status = 403;
      throw err;
    }

    const previousStatus = {
      lawyer_last_active_at: caseData.lawyer_last_active_at,
      lawyer_status: caseData.lawyer_status,
      deadline_alert_level: caseData.deadline_alert_level
    };

    const updatedCase = caseRepository.recordLawyerActivity(caseId);

    // If an associated task ID was provided, mark it completed
    if (activityData.task_id) {
      try {
        taskService.updateTask(activityData.task_id, {
          status: 'COMPLETED',
          completed_by: actor.name || actor.id,
          completed_at: new Date().toISOString()
        }, actor);
      } catch (e) {
        // Continue if task update fails
      }
    }

    // Record immutable audit log
    auditService.recordAuditEvent({
      case_id: caseId,
      application_id: caseData.application_id,
      action: AUDIT_ACTIONS.LAWYER_ACTIVITY_RECORDED,
      actor_id: actor.id,
      actor_role: actor.role,
      payload_before: previousStatus,
      payload_after: {
        lawyer_last_active_at: updatedCase.lawyer_last_active_at,
        lawyer_status: updatedCase.lawyer_status,
        activity_type: activityData.activity_type || 'HEARING_PROGRESS_REPORT',
        notes: activityData.notes || 'Lawyer submitted hearing progress report'
      },
      notes: `Panel lawyer activity recorded by ${actor.name || actor.id}: "${activityData.notes || 'Progress report filed'}"`
    });

    return updatedCase;
  }

  /**
   * Escalate lawyer inactivity / issue warning
   */
  escalateLawyer(caseId, escalationData = {}, actor) {
    const caseData = caseRepository.findById(caseId);
    if (!caseData) throw new Error(`Case ${caseId} not found`);

    const previousStatus = {
      lawyer_status: caseData.lawyer_status,
      deadline_alert_level: caseData.deadline_alert_level
    };

    const newLawyerStatus = escalationData.lawyer_status || 'WARNED';
    const newAlertLevel = 'CRITICAL_OVERDUE';

    const updatedCase = caseRepository.updateLawyerAccountability(caseId, {
      lawyer_status: newLawyerStatus,
      deadline_alert_level: newAlertLevel
    });

    // Create explicit follow-up task for DLAO accountability review
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 7);
    const dueDateStr = deadlineDate.toISOString().substring(0, 10);

    const followUpTask = taskService.createTask({
      case_id: caseId,
      title: escalationData.task_title || 'Issue Formal Show-Cause Warning & Accountability Review',
      title_bn: 'প্যানেল আইনজীবীকে আনুষ্ঠানিক কারণ দর্শানোর নোটিশ ও জবাবদিহিতা পর্যালোচনা',
      description: escalationData.reason || 'Assigned panel lawyer inactive exceeding statutory timeline. Formal DLAO review initiated.',
      assigned_to_role: ROLES.B1_DLAO_OFFICER,
      assigned_to_user_id: actor.id,
      due_date: dueDateStr,
      priority: 'URGENT',
      actor
    });

    // Record immutable audit event
    auditService.recordAuditEvent({
      case_id: caseId,
      application_id: caseData.application_id,
      action: AUDIT_ACTIONS.LAWYER_ESCALATED,
      actor_id: actor.id,
      actor_role: actor.role,
      payload_before: previousStatus,
      payload_after: {
        lawyer_status: newLawyerStatus,
        deadline_alert_level: newAlertLevel,
        task_id: followUpTask.id,
        reason: escalationData.reason || 'Exceeded inactivity threshold without court progress report'
      },
      notes: `Lawyer accountability escalated by ${actor.name || actor.id}. Follow-up task ${followUpTask.id} created.`
    });

    return {
      case: updatedCase,
      task: followUpTask
    };
  }

  /**
   * Safe, non-smartphone citizen status query
   * Strict privacy boundaries: NO internal audit, NO lawyer private notes, NO sensitive evidence
   */
  getCitizenStatus(queryTerm, actor = { id: 'ANONYMOUS', role: ROLES.CITIZEN_APPLICANT }) {
    if (!queryTerm) {
      throw new Error('A valid Application ID, Case Number, or Citizen Inquiry Code is required');
    }

    const caseRecord = caseRepository.findByInquiryOrId(queryTerm);
    if (!caseRecord) {
      return null;
    }

    // Compute safe plain-language status
    let statusPlain = 'Your case is currently registered with the District Legal Aid Office.';
    let statusPlainBn = 'আপনার মামলাটি বর্তমানে জেলা লিগ্যাল এইড অফিসে নিবন্ধিত রয়েছে।';

    switch (caseRecord.status) {
      case 'NEW':
      case 'INTAKE':
        statusPlain = 'Your application has been received and initial intake is in progress.';
        statusPlainBn = 'আপনার আবেদনটি গৃহীত হয়েছে এবং প্রাথমিক যাচাইকরণ প্রক্রিয়া চলছে।';
        break;
      case 'UNDER_REVIEW':
        statusPlain = 'Your case is currently being reviewed by the Legal Aid Officer.';
        statusPlainBn = 'আপনার মামলাটি বর্তমানে লিগ্যাল এইড অফিসার কর্তৃক পর্যালোচনা করা হচ্ছে।';
        break;
      case 'ASSIGNED':
        statusPlain = 'A panel lawyer has been assigned to represent your matter in court.';
        statusPlainBn = 'আদালতে আপনার প্রতিনিধিত্বের জন্য একজন প্যানেল আইনজীবী নিয়োগ করা হয়েছে।';
        break;
      case 'WAITING_FOR_ACTION':
        statusPlain = 'Your case is currently awaiting scheduled court hearing proceedings.';
        statusPlainBn = 'আপনার মামলাটি বর্তমানে নির্ধারিত আদালতের শুনানির পদক্ষেপের অপেক্ষায় রয়েছে।';
        break;
      case 'IN_PROGRESS':
        statusPlain = 'Legal proceedings are actively ongoing in court.';
        statusPlainBn = 'আদালতে আইনি কার্যক্রম নিয়মিতভাবে চলমান রয়েছে।';
        break;
      case 'MEDIATION':
        statusPlain = 'Your dispute is currently in Alternative Dispute Resolution (Mediation).';
        statusPlainBn = 'আপনার বিরোধটি বর্তমানে আপস-মীমাংসা (বিকল্প বিরোধ নিষ্পত্তি) প্রক্রিয়ায় রয়েছে।';
        break;
      case 'REFERRED':
        statusPlain = 'Your case has been referred to designated support agency.';
        statusPlainBn = 'আপনার মামলাটি নির্দিষ্ট সহায়তা সংস্থার নিকট স্থানান্তর করা হয়েছে।';
        break;
      case 'RESOLVED':
        statusPlain = 'Your legal aid matter has been successfully resolved.';
        statusPlainBn = 'আপনার লিগ্যাল এইড বিষয়টি সফলভাবে নিষ্পত্তি হয়েছে।';
        break;
      case 'CLOSED':
        statusPlain = 'This case has been administratively concluded and archived.';
        statusPlainBn = 'এই মামলাটির কার্যক্রম সমাপ্ত করে সংরক্ষণ করা হয়েছে।';
        break;
    }

    // Plain-language next action
    let nextAction = 'District Legal Aid Office reviewing case progress and coordinating with assigned counsel.';
    let nextActionBn = 'জেলা লিগ্যাল এইড অফিস মামলার অগ্রগতি পর্যালোচনা করছে এবং সংশ্লিষ্ট আইনজীবীর সাথে সমন্বয় করছে।';

    if (caseRecord.lawyer_status === 'SILENT_UNRESPONSIVE' || caseRecord.deadline_alert_level === 'CRITICAL_OVERDUE') {
      nextAction = 'District Legal Aid Office has flagged case progress for direct follow-up review.';
      nextActionBn = 'জেলা লিগ্যাল এইড অফিস মামলার অগ্রগতির জন্য সরাসরি তদারকি ও পর্যালোচনা কার্যক্রম শুরু করেছে।';
    }

    // Calculate approximate case age
    const filingDate = new Date(caseRecord.filing_date || caseRecord.created_at);
    const now = new Date();
    const elapsedMonths = Math.max(1, Math.round((now - filingDate) / (1000 * 60 * 60 * 24 * 30.4375)));

    // Formulate strictly sanitized, privacy-safe response
    const safePayload = {
      case_number: caseRecord.case_number,
      applicant_name: caseRecord.applicant_name || null,
      title: caseRecord.title,
      title_bn: caseRecord.title_bn,
      category: caseRecord.category,
      current_status: caseRecord.status,
      current_status_plain: statusPlain,
      current_status_plain_bn: statusPlainBn,
      filing_date: (caseRecord.filing_date || caseRecord.created_at).substring(0, 10),
      case_age_months: elapsedMonths,
      case_age_display: `~${elapsedMonths} months active`,
      case_age_display_bn: `প্রায় ${elapsedMonths} মাস চলমান`,
      last_update: (caseRecord.lawyer_last_active_at || caseRecord.updated_at || caseRecord.created_at).substring(0, 10),
      last_update_display: `Last case update: ${(caseRecord.lawyer_last_active_at || caseRecord.updated_at || caseRecord.created_at).substring(0, 10)}`,
      last_update_display_bn: `সর্বশেষ অগ্রগতি: ${(caseRecord.lawyer_last_active_at || caseRecord.updated_at || caseRecord.created_at).substring(0, 10)}`,
      next_action: nextAction,
      next_action_bn: nextActionBn,
      assigned_office: caseRecord.intake_office,
      court_name: caseRecord.court_name || 'Senior Assistant Judge Court',
      citizen_inquiry_code: caseRecord.citizen_inquiry_code,
      contact_follow_up: `Dial National Legal Aid Helpline 16699 or visit local Union Digital Center (UDC) with inquiry code: ${caseRecord.citizen_inquiry_code || caseRecord.case_number}.`,
      contact_follow_up_bn: `১৬৬৯৯ জাতীয় হেল্পলাইনে কল করুন অথবা আপনার অনুসন্ধান কোড (${caseRecord.citizen_inquiry_code || caseRecord.case_number}) নিয়ে স্থানীয় ইউনিয়ন ডিজিটাল সেন্টারে যোগাযোগ করুন।`,
      simulation_notice: 'Telecom/USSD integration simulated for prototype.',
      simulation_notice_bn: 'টেলিকম/ইউএসএসডি ইন্টিগ্রেশন প্রোটোটাইপের জন্য সিমুলেট করা হয়েছে।'
    };

    // Immutable audit trail logging of citizen query
    try {
      auditService.recordAuditEvent({
        case_id: caseRecord.id,
        application_id: caseRecord.application_id,
        action: AUDIT_ACTIONS.CITIZEN_STATUS_QUERIED,
        actor_id: actor.id || 'CITIZEN_INQUIRY',
        actor_role: actor.role || ROLES.CITIZEN_APPLICANT,
        notes: `Citizen queried case status via non-smartphone code/token: "${queryTerm}" (USSD/Telecom Simulated)`
      });
    } catch (e) {
      // Suppress secondary audit error
    }

    return safePayload;
  }
}

module.exports = new LawyerAccountabilityService();
