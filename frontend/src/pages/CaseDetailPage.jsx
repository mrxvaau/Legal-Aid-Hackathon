import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import PeopleCard from '../components/PeopleCard';
import ProvenanceView from '../components/ProvenanceView';
import TasksCard from '../components/TasksCard';
import ReferralsCard from '../components/ReferralsCard';
import IncidentsCard from '../components/IncidentsCard';
import AuditTrailView from '../components/AuditTrailView';
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

      {/* Mandatory Application Traceability Banner */}
      <div className="traceability-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🔗</span>
          <div>
            <strong>Mandatory Golden Thread Traceability:</strong>
            <span style={{ marginLeft: '6px' }}>
              Every Case ID derives from Application ID:
            </span>
            <span className="trace-id-badge">{caseData.application_id}</span>
            ➔
            <span className="trace-id-badge">{caseData.id}</span>
          </div>
        </div>
        <div className="intake-channel-badge">
          Channel: <strong>{caseData.intake_channel || 'DIRECT'}</strong>
        </div>
      </div>

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

      {/* Tabs navigation for clean organization */}
      <div className="dossier-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          👥 Participants & Incidents
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
      </div>

      {/* Tab Panels */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="stacked-cards">
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
      </div>
    </div>
  );
}
