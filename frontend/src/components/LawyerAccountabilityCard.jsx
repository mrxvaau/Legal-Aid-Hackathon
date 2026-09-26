import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

export default function LawyerAccountabilityCard({ caseId, caseData, onRefresh }) {
  const { language, t } = useLanguage();
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form states
  const [activityForm, setActivityForm] = useState({
    activity_type: 'HEARING_PROGRESS_REPORT',
    notes: 'Submitted statutory hearing progress report for Senior Assistant Judge Court.',
    task_id: ''
  });

  const [escalateForm, setEscalateForm] = useState({
    lawyer_status: 'WARNED',
    task_title: 'DLAO Formal Show-Cause Warning to Silent Panel Lawyer',
    reason: 'Assigned panel lawyer inactive exceeding 90 days statutory reporting limit without court explanation.'
  });

  const acct = caseData?.lawyer_accountability || {};
  const hasLawyer = !!caseData?.assigned_lawyer_id;
  const status = acct.accountability_status || caseData?.lawyer_status || 'ACTIVE';

  // Badge styling
  const getStatusBadgeStyle = (st) => {
    switch (st) {
      case 'ESCALATED':
      case 'SILENT_UNRESPONSIVE':
      case 'CRITICAL_OVERDUE':
        return { background: '#FEE2E2', color: '#991B1B', border: '1px solid #F87171' };
      case 'OVERDUE':
        return { background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' };
      case 'AT_RISK':
      case 'WARNED':
        return { background: '#FFEDD5', color: '#9A3412', border: '1px solid #FDBA74' };
      case 'ACTIVE':
        return { background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' };
      default:
        return { background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' };
    }
  };

  const handleRecordActivity = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.recordLawyerActivity(caseId, activityForm);
      setSuccessMsg(language === 'bn' ? 'আইনজীবীর কার্যক্রম সফলভাবে রেকর্ড করা হয়েছে।' : 'Lawyer activity recorded successfully.');
      setShowActivityModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to record lawyer activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.escalateLawyer(caseId, escalateForm);
      setSuccessMsg(language === 'bn' ? 'মামলাটি জবাবদিহিতার জন্য সফলভাবে এসকেলেট করা হয়েছে।' : 'Lawyer accountability escalated and follow-up task created.');
      setShowEscalateModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to escalate case');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card lawyer-accountability-card" role="region" aria-label="Lawyer Accountability">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>⚖️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
              {t('accountability.title')}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
              {t('accountability.subtitle')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span 
            className="badge" 
            style={{ 
              ...getStatusBadgeStyle(status),
              padding: '6px 12px', 
              fontSize: '13px', 
              fontWeight: '700', 
              borderRadius: '20px' 
            }}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="card-body">
        {/* Operational Deterministic Notice */}
        <div style={{ 
          background: '#F0FDF4', 
          border: '1px solid #BBF7D0', 
          borderRadius: '8px', 
          padding: '10px 14px', 
          fontSize: '12px', 
          color: '#166534', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '16px'
        }}>
          <span>📏</span>
          <span>{t('accountability.operationalNotice')}</span>
        </div>

        {/* Success or Error alerts */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '16px' }} role="alert">
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }} role="alert">
            ✅ {successMsg}
          </div>
        )}

        {/* Metrics Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '14px',
          marginBottom: '16px' 
        }}>
          {/* Assigned Lawyer */}
          <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', display: 'block' }}>
              {t('accountability.assignedLawyer')}:
            </span>
            <strong style={{ fontSize: '15px', color: '#1E293B', display: 'block', marginTop: '4px' }}>
              {hasLawyer ? (caseData.assigned_lawyer_name || caseData.assigned_lawyer_id) : t('accountability.unassigned')}
            </strong>
            {hasLawyer && (
              <span style={{ fontSize: '11px', color: '#64748B' }}>ID: {caseData.assigned_lawyer_id}</span>
            )}
          </div>

          {/* Case Age */}
          <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', display: 'block' }}>
              {t('accountability.caseAge')}:
            </span>
            <strong style={{ fontSize: '15px', color: '#1E293B', display: 'block', marginTop: '4px' }}>
              {language === 'bn' ? (acct.case_age_display_bn || '৭ মাস চলমান') : (acct.case_age_display || '~7 months active')}
            </strong>
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              {t('accountability.filedOn')}: {caseData.filing_date?.substring(0, 10)}
            </span>
          </div>

          {/* Last Activity */}
          <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', display: 'block' }}>
              {t('accountability.lastActivity')}:
            </span>
            <strong style={{ fontSize: '15px', color: acct.days_since_last_activity >= 60 ? '#B91C1C' : '#1E293B', display: 'block', marginTop: '4px' }}>
              {caseData.lawyer_last_active_at ? caseData.lawyer_last_active_at.substring(0, 10) : t('common.none')}
            </strong>
            <span style={{ fontSize: '11px', color: acct.days_since_last_activity >= 60 ? '#B91C1C' : '#64748B', fontWeight: '600' }}>
              {acct.days_since_last_activity != null ? `${acct.days_since_last_activity} ${t('accountability.daysInactive')}` : ''}
            </span>
          </div>

          {/* Next Deadline */}
          <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', display: 'block' }}>
              {t('accountability.nextDeadline')}:
            </span>
            <strong style={{ fontSize: '15px', color: acct.is_deadline_passed ? '#B91C1C' : '#1E293B', display: 'block', marginTop: '4px' }}>
              {acct.next_deadline ? acct.next_deadline.substring(0, 10) : t('accountability.noPendingDeadline')}
            </strong>
            {acct.is_deadline_passed && (
              <span style={{ fontSize: '11px', color: '#B91C1C', fontWeight: '700' }}>
                🚨 {t('accountability.overdueBy')} {acct.days_overdue} {t('accountability.days')}
              </span>
            )}
          </div>
        </div>

        {/* Factual Escalation Reason Banner (if status is not ACTIVE) */}
        {(status === 'ESCALATED' || status === 'SILENT_UNRESPONSIVE' || status === 'OVERDUE' || status === 'WARNED') && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <strong style={{ color: '#991B1B', fontSize: '14px', display: 'block' }}>
                  {t('accountability.escalationReasonTitle')}:
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#7F1D1D', lineHeight: '1.4' }}>
                  {language === 'bn' 
                    ? (acct.escalation_reason_bn || 'প্যানেল আইনজীবী দীর্ঘদিন যাবত কোনো কার্যক্রম রেকর্ড করেননি এবং শুনানির প্রতিবেদনের সময়সীমা উত্তীর্ণ হয়েছে।')
                    : (acct.escalation_reason || 'Assigned lawyer has had no recorded activity exceeding statutory period and action deadline has passed.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Citizen Non-Smartphone Token Display */}
        {caseData.citizen_inquiry_code && (
          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '16px'
          }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#1E40AF', display: 'block' }}>
                📱 {t('accountability.inquiryTokenLabel')}
              </span>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#1E3A8A', letterSpacing: '1px' }}>
                {caseData.citizen_inquiry_code}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#3B82F6' }}>
              USSD / 16699 / UDC Inquiry (No Smartphone)
            </div>
          </div>
        )}

        {/* Action Controls for Staff & Panel Lawyer */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => setShowActivityModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📝</span> {t('accountability.recordActivityBtn')}
          </button>

          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => setShowEscalateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>⚠️</span> {t('accountability.escalateBtn')}
          </button>
        </div>
      </div>

      {/* Record Activity Modal */}
      {showActivityModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="modal-card" style={{
            background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>
              📝 {t('accountability.recordActivityTitle')}
            </h4>

            <form onSubmit={handleRecordActivity}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  {t('accountability.activityType')}:
                </label>
                <select
                  className="form-control"
                  value={activityForm.activity_type}
                  onChange={(e) => setActivityForm({ ...activityForm, activity_type: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                >
                  <option value="HEARING_PROGRESS_REPORT">Hearing Progress Report (শুনানির অগ্রগতি প্রতিবেদন)</option>
                  <option value="COURT_APPEARANCE">Court Appearance (আদালতে হাজিরা)</option>
                  <option value="CLIENT_CONSULTATION">Client Consultation (মক্কেল পরামর্শ)</option>
                  <option value="LEGAL_DOCUMENT_FILED">Legal Document Filed (আইনি নথি দাখিল)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  {t('accountability.activityNotes')}:
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowActivityModal(false)}
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? t('common.loading') : t('accountability.submitActivity')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate / Issue Warning Modal */}
      {showEscalateModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="modal-card" style={{
            background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#991B1B' }}>
              ⚠️ {t('accountability.escalateTitle')}
            </h4>

            <form onSubmit={handleEscalate}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  {t('accountability.escalateStatusLevel')}:
                </label>
                <select
                  className="form-control"
                  value={escalateForm.lawyer_status}
                  onChange={(e) => setEscalateForm({ ...escalateForm, lawyer_status: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                >
                  <option value="WARNED">Formal Warning Issued (সতর্কবার্তা জারি)</option>
                  <option value="SILENT_UNRESPONSIVE">Silent / Unresponsive Flag (অনুপস্থিত/নীরব চিহ্নিত)</option>
                  <option value="REASSIGNED">Initiate Case Reassignment (পুনঃনিয়োগ প্রক্রিয়া শুরু)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  {t('accountability.taskTitle')}:
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={escalateForm.task_title}
                  onChange={(e) => setEscalateForm({ ...escalateForm, task_title: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  {t('accountability.escalateReason')}:
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={escalateForm.reason}
                  onChange={(e) => setEscalateForm({ ...escalateForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEscalateModal(false)}
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={submitting}
                >
                  {submitting ? t('common.loading') : t('accountability.submitEscalate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
