import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

export default function GoldenThreadCard({ caseData, onSelectTab }) {
  const { language, t } = useLanguage();
  const [showAppModal, setShowAppModal] = useState(false);
  const [appDetails, setAppDetails] = useState(null);
  const [loadingApp, setLoadingApp] = useState(false);

  if (!caseData) return null;

  const handleOpenAppDetails = async () => {
    setShowAppModal(true);
    if (!appDetails && caseData.application_id) {
      setLoadingApp(true);
      try {
        const res = await api.getApplication(caseData.application_id);
        setAppDetails(res.data);
      } catch (err) {
        // Fallback to caseData embedded application info
        setAppDetails({
          id: caseData.application_id,
          category: caseData.category,
          intake_channel: caseData.intake_channel,
          intake_office: caseData.intake_office,
          applicant_name: caseData.applicant_name,
          representative_name: caseData.representative_name,
          summary: caseData.application_summary,
          summary_bn: caseData.application_summary_bn,
          status: 'CONVERTED_TO_CASE'
        });
      } finally {
        setLoadingApp(false);
      }
    }
  };

  const peopleCount = caseData.people?.length || 0;
  const provCount = caseData.provenance?.length || 0;
  const tasksCount = caseData.tasks?.length || 0;
  const referralsCount = caseData.referrals?.length || 0;
  const evidenceCount = caseData.evidence?.length || 0;
  const auditCount = caseData.audit_trail?.length || 0;
  const hasSafeContact = caseData.safe_contacts && caseData.safe_contacts.length > 0;
  const lawyerAcc = caseData.lawyer_accountability;

  return (
    <section className="golden-thread-container" aria-label="Golden Thread Architecture">
      <div className="golden-thread-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🔗</span>
          <div>
            <h3 className="golden-thread-title">
              {language === 'bn' ? 'গোল্ডেন থ্রেড ইন্টিগ্রেশন ট্রেসিবিলিটি' : 'The Golden Thread — Continuous System Traceability'}
            </h3>
            <p className="golden-thread-subtitle">
              {language === 'bn' 
                ? 'নাগরিক ইনটেক থেকে চূড়ান্ত অডিট পর্যন্ত অবিচ্ছিন্ন ডেটা চেইন ও সুরক্ষা কাঠামো'
                : 'Unbroken data lineage: Citizen Intake ➔ Application ➔ Case ➔ People ➔ Provenance ➔ Tasks ➔ Referrals ➔ Evidence ➔ Audit'}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn-view-app-meta"
          onClick={handleOpenAppDetails}
          title="Inspect raw intake application"
        >
          📋 {language === 'bn' ? 'মূল আবেদন পরিদর্শন' : 'Inspect Intake Application'} ({caseData.application_id})
        </button>
      </div>

      {/* Stepper Chain */}
      <div className="golden-thread-stepper">
        {/* 1. Application */}
        <div
          className="stepper-step completed"
          onClick={handleOpenAppDetails}
          title="Click to view original Application intake"
          tabIndex={0}
        >
          <div className="step-badge">1. Application</div>
          <div className="step-name">{caseData.application_id}</div>
          <div className="step-meta">Channel: {caseData.intake_channel || 'DIRECT'}</div>
        </div>

        <div className="stepper-arrow">➔</div>

        {/* 2. Case */}
        <div
          className="stepper-step completed"
          onClick={() => onSelectTab && onSelectTab('overview')}
          title="Click to view Case Overview"
          tabIndex={0}
        >
          <div className="step-badge">2. Case</div>
          <div className="step-name">{caseData.case_number}</div>
          <div className="step-meta">Status: {caseData.status}</div>
        </div>

        <div className="stepper-arrow">➔</div>

        {/* 3. People & Safe Contact */}
        <div
          className="stepper-step completed"
          onClick={() => onSelectTab && onSelectTab('overview')}
          title="Click to view People & Safe Contact"
          tabIndex={0}
        >
          <div className="step-badge">3. People & Safety</div>
          <div className="step-name">{peopleCount} Participants</div>
          <div className="step-meta">
            {hasSafeContact ? '🛡️ Safe Contact Active' : 'Standard Contact'}
          </div>
        </div>

        <div className="stepper-arrow">➔</div>

        {/* 4. Provenance */}
        <div
          className="stepper-step completed"
          onClick={() => onSelectTab && onSelectTab('provenance')}
          title="Click to view Provenance Log"
          tabIndex={0}
        >
          <div className="step-badge">4. Provenance</div>
          <div className="step-name">{provCount} Logged Stages</div>
          <div className="step-meta">Oral ➔ Typed ➔ AI ➔ Confirmed</div>
        </div>

        <div className="stepper-arrow">➔</div>

        {/* 5. Tasks / SLAs */}
        <div
          className={`stepper-step ${tasksCount > 0 ? 'completed' : 'neutral'}`}
          onClick={() => onSelectTab && onSelectTab('tasks')}
          title="Click to view Tasks & SLAs"
          tabIndex={0}
        >
          <div className="step-badge">5. Tasks & SLAs</div>
          <div className="step-name">{tasksCount} Active Tasks</div>
          <div className="step-meta">
            {caseData.lawyer_status === 'SILENT_UNRESPONSIVE' ? '⚠️ Overdue Action' : 'Tracked'}
          </div>
        </div>

        <div className="stepper-arrow">➔</div>

        {/* 6. Referrals */}
        <div
          className={`stepper-step ${referralsCount > 0 ? 'completed' : 'neutral'}`}
          onClick={() => onSelectTab && onSelectTab('referrals')}
          title="Click to view Referrals"
          tabIndex={0}
        >
          <div className="step-badge">6. Referrals</div>
          <div className="step-name">{referralsCount} Dispatched</div>
          <div className="step-meta">
            {referralsCount > 0 ? 'PCSW / Institutional' : 'Internal'}
          </div>
        </div>

        <div className="stepper-arrow">➔</div>

        {/* 7. Evidence */}
        <div
          className={`stepper-step ${evidenceCount > 0 ? 'completed' : 'neutral'}`}
          onClick={() => onSelectTab && onSelectTab('evidence')}
          title="Click to view Evidence Vault"
          tabIndex={0}
        >
          <div className="step-badge">7. Evidence Vault</div>
          <div className="step-name">{evidenceCount} Digital Assets</div>
          <div className="step-meta">
            {caseData.category === 'GENDER_VIOLENCE' ? '🔒 Strictly Restricted' : 'Secure Storage'}
          </div>
        </div>

        <div className="stepper-arrow">➔</div>

        {/* 8. Lawyer Accountability */}
        <div
          className={`stepper-step ${caseData.assigned_lawyer_id ? 'completed' : 'neutral'}`}
          onClick={() => onSelectTab && onSelectTab('accountability')}
          title="Click to view Lawyer Accountability"
          tabIndex={0}
        >
          <div className="step-badge">8. Accountability</div>
          <div className="step-name">
            {lawyerAcc?.accountability_status || (caseData.assigned_lawyer_id ? 'ACTIVE' : 'NONE')}
          </div>
          <div className="step-meta">
            {lawyerAcc?.days_since_last_activity ? `${lawyerAcc.days_since_last_activity}d Inactive` : 'Monitored'}
          </div>
        </div>

        <div className="stepper-arrow">➔</div>

        {/* 9. Audit Trail */}
        <div
          className="stepper-step completed"
          onClick={() => onSelectTab && onSelectTab('audit')}
          title="Click to view Immutable Audit Trail"
          tabIndex={0}
        >
          <div className="step-badge">9. Immutable Audit</div>
          <div className="step-name">{auditCount} Verified Events</div>
          <div className="step-meta">SQLite Trigger Protection</div>
        </div>
      </div>

      {/* Application Details Modal */}
      {showAppModal && (
        <div className="conflict-modal-overlay" role="dialog" aria-modal="true">
          <div className="conflict-modal-content" style={{ maxWidth: '720px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>📋</span>
                <h3 style={{ margin: 0, color: '#0F172A', fontSize: '18px', fontWeight: '800' }}>
                  {language === 'bn' ? 'মূল ইনটেক আবেদন বিস্তারিত' : 'Original Intake Application Dossier'}
                </h3>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAppModal(false)}
                style={{ padding: '4px 10px', fontSize: '13px' }}
              >
                ✕ Close
              </button>
            </div>

            {loadingApp ? (
              <div style={{ padding: '30px', textAlign: 'center' }}>
                <div className="spinner"></div>
                <p>Loading application data...</p>
              </div>
            ) : appDetails ? (
              <div>
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: '700' }}>APPLICATION ID</span>
                      <strong style={{ color: '#0F172A' }}>{appDetails.id}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: '700' }}>INTAKE CHANNEL</span>
                      <span style={{
                        background: '#E0F2FE',
                        color: '#0369A1',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: '700',
                        fontSize: '11px'
                      }}>
                        {appDetails.intake_channel}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: '700' }}>INTAKE OFFICE</span>
                      <strong>{appDetails.intake_office}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: '700' }}>STATUS</span>
                      <span style={{
                        background: '#DCFCE7',
                        color: '#15803D',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: '700',
                        fontSize: '11px'
                      }}>
                        {appDetails.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <h4 style={{ fontSize: '13px', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Applicant & Representative Information
                  </h4>
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    fontSize: '13px'
                  }}>
                    <p style={{ margin: '0 0 4px 0' }}>
                      <strong>Applicant:</strong> {appDetails.applicant_name} ({appDetails.applicant_phone || 'Protected Contact'})
                    </p>
                    {appDetails.representative_name && (
                      <p style={{ margin: 0, color: '#1E40AF' }}>
                        <strong>Authorized Representative:</strong> 👤 {appDetails.representative_name} ({appDetails.representative_phone || 'Direct'})
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <h4 style={{ fontSize: '13px', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Intake Statement & Narrative
                  </h4>
                  <div style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: '#1E293B'
                  }}>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '600' }}>{appDetails.summary}</p>
                    {appDetails.summary_bn && (
                      <p style={{ margin: 0, color: '#475569' }}>{appDetails.summary_bn}</p>
                    )}
                  </div>
                </div>

                {appDetails.details && Object.keys(appDetails.details).length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '13px', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Intake Configuration Metadata
                    </h4>
                    <pre style={{
                      background: '#0F172A',
                      color: '#38BDF8',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      overflowX: 'auto'
                    }}>
                      {JSON.stringify(appDetails.details, null, 2)}
                    </pre>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowAppModal(false)}
                  >
                    Done Reviewing
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
