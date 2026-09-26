import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import PeopleCard from '../components/PeopleCard';
import ProvenanceView from '../components/ProvenanceView';
import TasksCard from '../components/TasksCard';
import ReferralsCard from '../components/ReferralsCard';
import IncidentsCard from '../components/IncidentsCard';
import AuditTrailView from '../components/AuditTrailView';
import SafeContactCard from '../components/SafeContactCard';
import EvidenceVaultCard from '../components/EvidenceVaultCard';
import LawyerAccountabilityCard from '../components/LawyerAccountabilityCard';
import GoldenThreadCard from '../components/GoldenThreadCard';
import api from '../services/api';

const ALL_STATES = [
  'NEW', 'INTAKE', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS',
  'REFERRED', 'MEDIATION', 'SETTLEMENT_DRAFT', 'WAITING_FOR_ACTION',
  'RESOLVED', 'CLOSED'
];

export default function CaseDetailPage({ caseId, onBack }) {
  const { language, t } = useLanguage();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [statusSuccess, setStatusSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const loadCase = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCase(caseId);
      setCaseData(res.data);
      setNewStatus(res.data.status);
    } catch (err) {
      setError(err.message || 'Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [caseId]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!newStatus || newStatus === caseData.status) return;

    setUpdatingStatus(true);
    setError(null);
    setStatusSuccess(false);
    try {
      await api.updateCaseStatus(caseId, newStatus, statusNotes);
      setStatusSuccess(true);
      setStatusNotes('');
      setTimeout(() => setStatusSuccess(false), 3000);
      await loadCase();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="page-container">
        <div className="error-banner">⚠️ {error}</div>
        <button className="btn-secondary" onClick={onBack}>
          ← {t('common.back')}
        </button>
      </div>
    );
  }

  if (!caseData) return null;

  const displayTitle = language === 'bn' && caseData.title_bn ? caseData.title_bn : caseData.title;

  return (
    <div className="page-container">
      {/* Back Button & Top Navigation */}
      <div style={{ marginBottom: '16px' }}>
        <button className="btn-secondary" onClick={onBack}>
          ← {t('common.back')}
        </button>
      </div>

      {/* Golden Thread Integrated Traceability Stepper */}
      <GoldenThreadCard
        caseData={caseData}
        onSelectTab={setActiveTab}
      />

      {/* Case Header Card */}
      <div className="case-header-card">
        <div className="header-top-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h2 className="dossier-case-number">{caseData.case_number}</h2>
              <StatusBadge status={caseData.status} />
              <span className={`priority-tag ${caseData.priority.toLowerCase()}`}>
                Priority: {caseData.priority}
              </span>
            </div>
            <h3 className="dossier-title">{displayTitle}</h3>
          </div>

          {/* Status Update Control */}
          <form onSubmit={handleStatusUpdate} className="status-update-form">
            <label className="form-label" style={{ marginBottom: '4px' }}>
              {t('cases.changeStatus')}:
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                className="form-input"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '13px' }}
              >
                {ALL_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s} ({t(`states.${s}`, s)})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="btn-primary-sm"
                disabled={updatingStatus || newStatus === caseData.status}
              >
                {updatingStatus ? 'Updating...' : t('common.save')}
              </button>
            </div>
            {statusSuccess && (
              <span style={{ color: '#16A34A', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                ✓ {t('cases.statusUpdated')}
              </span>
            )}
          </form>
        </div>

        {/* Metadata Grid */}
        <div className="header-meta-grid">
          <div>
            <span className="meta-label">Category:</span>
            <span className="meta-value">{caseData.category}</span>
          </div>
          <div>
            <span className="meta-label">Intake Office:</span>
            <span className="meta-value">{caseData.intake_office}</span>
          </div>
          <div>
            <span className="meta-label">Court Jurisdiction:</span>
            <span className="meta-value">{caseData.court_name || 'Designated District Court'}</span>
          </div>
          <div>
            <span className="meta-label">Assigned Panel Lawyer:</span>
            <span className="meta-value">
              {caseData.assigned_lawyer_name ? (
                `⚖️ ${caseData.assigned_lawyer_name}`
              ) : (
                <span style={{ color: '#9CA3AF' }}>Not Assigned</span>
              )}
            </span>
          </div>
        </div>

        {caseData.application_summary && (
          <div className="application-summary-box">
            <strong>Original Application Summary:</strong> {caseData.application_summary}
          </div>
        )}
      </div>

      {/* Scenario 5: Panel Lawyer Accountability & Silence Alert */}
      {caseData.lawyer_status === 'SILENT_UNRESPONSIVE' && (
        <div className="lawyer-alert-banner" style={{
          background: '#FEF2F2',
          border: '2px solid #EF4444',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>⚖️</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, color: '#991B1B', fontSize: '15px', fontWeight: '800' }}>
                  {t('lawyerAlert.silentWarning')}
                </h4>
                <span style={{
                  background: '#991B1B',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {caseData.lawyer_accountability?.case_age_display || '~7 months active'}
                </span>
                <span style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid #F87171'
                }}>
                  {caseData.lawyer_accountability?.days_since_last_activity ? `${caseData.lawyer_accountability.days_since_last_activity} ${t('accountability.daysInactive')}` : 'Overdue Inactivity'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#7F1D1D' }}>
                {caseData.lawyer_accountability?.escalation_reason || t('lawyerAlert.silentDesc')}
              </p>
            </div>
          </div>
          {caseData.citizen_inquiry_code && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #DC2626',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              color: '#991B1B'
            }}>
              <span style={{ fontWeight: '600' }}>📱 {t('lawyerAlert.inquiryCode')}: </span>
              <strong style={{ fontSize: '14px', letterSpacing: '1px', color: '#B91C1C', display: 'block' }}>
                {caseData.citizen_inquiry_code}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* Flow 3: Sensitive Digital Harassment & Urgent Escalation Indicator */}
      {(caseData.category === 'GENDER_VIOLENCE' || caseData.evidence?.some(e => e.sensitivity_level === 'STRICTLY_RESTRICTED_IMAGE_ABUSE')) && (
        <div style={{
          background: '#FEF2F2',
          border: '2px solid #DC2626',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>🚨</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, color: '#991B1B', fontSize: '15px', fontWeight: '800' }}>
                    {t('nabilaAlert.title')}
                  </h4>
                  <span style={{
                    background: '#991B1B',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {t('nabilaAlert.urgentBadge')}
                  </span>
                  <span style={{
                    background: '#FEE2E2',
                    color: '#991B1B',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #F87171'
                  }}>
                    🔒 {t('nabilaAlert.sensitiveCaseBadge')}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#7F1D1D' }}>
                  <strong>{t('nabilaAlert.reasonLabel')}:</strong> {t('nabilaAlert.reasonDesc')}
                </p>
              </div>
            </div>

            <div style={{
              background: '#FFFFFF',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              color: '#991B1B',
              fontWeight: '600'
            }}>
              ⚖️ {t('nabilaAlert.humanConfirmationRequired')}
            </div>
          </div>
        </div>
      )}

      {/* Tabs navigation for clean organization */}
      <div className="dossier-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          👥 Overview & Safe Contact ({caseData.safe_contacts?.length ? '🛡️ Protected' : 'Standard'})
        </button>
        <button
          className={`tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
          onClick={() => setActiveTab('evidence')}
          style={caseData.evidence?.some(e => e.sensitivity_level === 'STRICTLY_RESTRICTED_IMAGE_ABUSE') ? { color: '#DC2626', fontWeight: '700' } : {}}
        >
          🔒 {t('evidence.tabTitle')} ({caseData.evidence?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'provenance' ? 'active' : ''}`}
          onClick={() => setActiveTab('provenance')}
        >
          🔍 Provenance Log ({caseData.provenance?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          ✅ Tasks & SLAs ({caseData.tasks?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'accountability' ? 'active' : ''}`}
          onClick={() => setActiveTab('accountability')}
          style={(caseData.lawyer_status === 'SILENT_UNRESPONSIVE' || caseData.deadline_alert_level === 'CRITICAL_OVERDUE') ? { color: '#DC2626', fontWeight: '700' } : {}}
        >
          ⚖️ {t('accountability.tabTitle')} ({caseData.lawyer_accountability?.accountability_status || (caseData.assigned_lawyer_id ? 'ACTIVE' : 'NONE')})
        </button>
        <button
          className={`tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          🔄 Referrals ({caseData.referrals?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📜 Audit Trail ({caseData.audit_trail?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'goldenthread' ? 'active' : ''}`}
          onClick={() => setActiveTab('goldenthread')}
          style={{ borderColor: '#0D9488', color: '#0F766E', fontWeight: '700' }}
        >
          🔗 {language === 'bn' ? 'গোল্ডেন থ্রেড ম্যাপ' : 'Golden Thread Map'}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="stacked-cards">
            {/* Flow 4: Lawyer Accountability Card if assigned */}
            {caseData.assigned_lawyer_id && (
              <LawyerAccountabilityCard
                caseId={caseId}
                caseData={caseData}
                onRefresh={loadCase}
              />
            )}
            {/* Flow 1: Safe Contact Protocol Card */}
            <SafeContactCard
              caseId={caseId}
              safeContacts={caseData.safe_contacts || []}
              onRefresh={loadCase}
            />
            <PeopleCard
              caseId={caseId}
              people={caseData.people || []}
              onRefresh={loadCase}
            />
            <IncidentsCard
              caseId={caseId}
              incidents={caseData.incidents || []}
              onRefresh={loadCase}
            />
          </div>
        )}

        {activeTab === 'accountability' && (
          <LawyerAccountabilityCard
            caseId={caseId}
            caseData={caseData}
            onRefresh={loadCase}
          />
        )}

        {activeTab === 'provenance' && (
          <ProvenanceView
            caseId={caseId}
            provenance={caseData.provenance || []}
            onRefresh={loadCase}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksCard
            caseId={caseId}
            tasks={caseData.tasks || []}
            onRefresh={loadCase}
          />
        )}

        {activeTab === 'evidence' && (
          <EvidenceVaultCard
            caseId={caseId}
            evidence={caseData.evidence || []}
            onRefresh={loadCase}
          />
        )}

        {activeTab === 'referrals' && (
          <ReferralsCard
            caseId={caseId}
            referrals={caseData.referrals || []}
            onRefresh={loadCase}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTrailView
            auditTrail={caseData.audit_trail || []}
          />
        )}

        {activeTab === 'goldenthread' && (
          <GoldenThreadCard
            caseData={caseData}
            onSelectTab={setActiveTab}
          />
        )}
      </div>
    </div>
  );
}
