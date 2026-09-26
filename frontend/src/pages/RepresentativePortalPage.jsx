import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function RepresentativePortalPage({ onNavigateToCitizenPortal, onViewFullDossier }) {
  const { language, t } = useLanguage();
  const [caseRecord, setCaseRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Follow-up statement submission
  const [statementText, setStatementText] = useState('');
  const [submittingStatement, setSubmittingStatement] = useState(false);
  const [statementSuccess, setStatementSuccess] = useState(false);

  // Case ID for Moyuri Akter represented by Ripon
  const targetCaseId = 'CASE-20260901-0001';

  const loadCase = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCase(targetCaseId);
      setCaseRecord(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load case for Moyuri Akter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, []);

  const handleStatementSubmit = async (e) => {
    e.preventDefault();
    if (!statementText.trim()) return;

    setSubmittingStatement(true);
    setStatementSuccess(false);
    try {
      // Record follow-up event/provenance on behalf of Moyuri
      await api.createCaseEvent(targetCaseId, {
        action: 'REPRESENTATIVE_STATEMENT_FILED',
        notes: `Secondhand follow-up statement submitted by Ripon on behalf of Moyuri Akter: "${statementText.trim()}"`
      });

      setStatementSuccess(true);
      setStatementText('');
      await loadCase();
      setTimeout(() => setStatementSuccess(false), 5000);
    } catch (err) {
      setError(err.message || 'Failed to submit statement');
    } finally {
      setSubmittingStatement(false);
    }
  };

  return (
    <div className="citizen-portal-container" role="main" aria-label="Authorized Representative Portal">
      {/* Representative Banner Card */}
      <div className="rep-header-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div className="rep-avatar" aria-hidden="true">♿</div>
          <div>
            <div className="rep-role-tag">
              {t('representative.repRole')}
            </div>
            <h2 className="rep-name">{t('representative.repName')}</h2>
            <p className="rep-representing-text">
              🤝 <strong>{t('representative.representedPerson')}</strong>
            </p>
          </div>
        </div>

        <div className="rep-identity-doc-badge">
          📄 <strong>{t('people.authDoc')}:</strong> DLAO-REP-AUTH-2026-DH-091
        </div>
      </div>

      {/* Ripon Accessibility & Voice-First Pathway Explanation */}
      <div className="rep-accessibility-banner" role="region" aria-label={t('representative.accessibilityTitle')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '26px' }} aria-hidden="true">📢</span>
          <div>
            <h3 className="rep-access-title">
              {t('representative.accessibilityTitle')}
            </h3>
            <p className="rep-access-desc">
              {t('representative.accessibilityNotice')}
            </p>
          </div>
        </div>

        {/* Keyboard accessibility guidance */}
        <div className="rep-keyboard-hints" aria-label="Accessible Keyboard Navigation Guide">
          <span>⌨️ <strong>Accessibility Checklist:</strong> Logical tab sequence • High-contrast visible focus rings • No visual CAPTCHA • Semantic HTML labels</span>
        </div>
      </div>

      {/* Identity Separation Notice */}
      <div className="rep-separation-banner">
        🔒 {t('representative.distinctIdentityProof')}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="citizen-loading-box" role="status" aria-live="polite">
          <div className="spinner" />
          <p>{t('common.loading')}</p>
        </div>
      )}

      {error && (
        <div className="citizen-alert-box error" role="alert">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* Represented Case Dossier Card */}
      {caseRecord && !loading && (
        <div className="citizen-status-card" style={{ marginTop: '18px' }}>
          <div className="citizen-card-header">
            <div>
              <span className="citizen-badge-app">{caseRecord.application_id}</span>
              <h3 className="citizen-case-number">
                {language === 'bn' && caseRecord.title_bn ? caseRecord.title_bn : caseRecord.title}
              </h3>
              <p className="citizen-case-meta">
                Case No: <strong>{caseRecord.case_number}</strong> • Receiving Office: <strong>{caseRecord.intake_office}</strong>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <StatusBadge status={caseRecord.status} />
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748B' }}>
                Priority: <strong>{caseRecord.priority}</strong>
              </div>
            </div>
          </div>

          {/* Safe Contact Notice for Ripon */}
          <div className="citizen-safe-shield-banner" style={{ background: '#F0FDF4', borderColor: '#86EFAC' }} role="status">
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <div>
              <strong style={{ color: '#166534' }}>
                {language === 'bn' ? 'সুরক্ষিত যোগাযোগ ব্যবস্থা কার্যকর — প্রতিনিধি মাধ্যম' : 'Safe Contact Protocol Active — Exclusive Representative Channel'}
              </strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#14532D' }}>
                Perpetrator husband intercepts all incoming communications. All hearing notices and officer communications are routed strictly through brother Ripon at <strong>01822000102</strong>.
              </p>
            </div>
          </div>

          {/* Facts Grid */}
          <div className="citizen-facts-grid">
            <div className="citizen-fact-cell">
              <span className="fact-label">{t('citizen.caseStatus')}:</span>
              <span className="fact-value highlight">{caseRecord.status?.replace(/_/g, ' ')}</span>
            </div>

            <div className="citizen-fact-cell">
              <span className="fact-label">{t('citizen.nextStep')}:</span>
              <span className="fact-value">
                Legal Aid Officer serving confidential mediation summons to respondent Faruk Hossain without disclosing sister's temporary shelter address.
              </span>
            </div>

            <div className="citizen-fact-cell">
              <span className="fact-label">Authorized Representative:</span>
              <span className="fact-value">Ripon (Brother) • Verified via DLAO Form</span>
            </div>

            <div className="citizen-fact-cell">
              <span className="fact-label">{t('citizen.lastUpdated')}:</span>
              <span className="fact-value">{new Date(caseRecord.updated_at || caseRecord.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Plain-Language Provenance Breakdown */}
          <div className="citizen-provenance-box" role="region" aria-label={t('citizen.provenanceTitle')}>
            <h4 className="citizen-subheading">
              🔍 {t('citizen.provenanceTitle')}
            </h4>
            <div className="citizen-qa-list">
              <div className="qa-item">
                <span className="qa-q">{t('citizen.whoProvided')}</span>
                <span className="qa-a">👤 Moyuri Akter (Sister & Survivor — Oral Narrative)</span>
              </div>
              <div className="qa-item">
                <span className="qa-q">{t('citizen.whoSubmitted')}</span>
                <span className="qa-a">📝 Ripon (Authorized Brother & Representative — Accessible Voice-First Mode)</span>
              </div>
              <div className="qa-item">
                <span className="qa-q">{t('citizen.wasTranslated')}</span>
                <span className="qa-a">🌐 Direct Bangla oral submission (No translation needed)</span>
              </div>
              <div className="qa-item">
                <span className="qa-q">{t('citizen.wasConfirmed')}</span>
                <span className="qa-a">✅ Verified and certified by DLAO Officer B1</span>
              </div>
            </div>
          </div>

          {/* Action Form: Submit Follow-up Statement on Moyuri's Behalf */}
          <div style={{ marginTop: '20px', padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#1E293B', fontWeight: '700' }}>
              ✍️ {t('representative.submitFollowup')}
            </h4>

            {statementSuccess && (
              <div className="citizen-alert-box success" role="status" aria-live="polite">
                <span>✓</span>
                <div>{t('representative.statementSuccess')}</div>
              </div>
            )}

            <form onSubmit={handleStatementSubmit}>
              <label htmlFor="rep-statement-input" className="form-label">
                {language === 'bn' ? 'ময়ূরীর পক্ষে অতিরিক্ত বক্তব্য / নিরাপত্তা তথ্য:' : 'Statement / Information on Behalf of Moyuri:'}
              </label>
              <textarea
                id="rep-statement-input"
                required
                rows={3}
                className="citizen-input"
                style={{ width: '100%', marginBottom: '10px' }}
                value={statementText}
                onChange={(e) => setStatementText(e.target.value)}
                placeholder={t('representative.statementPlaceholder')}
                aria-required="true"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="submit"
                  className="btn-citizen-primary"
                  disabled={submittingStatement}
                >
                  {submittingStatement ? t('common.loading') : `📤 ${language === 'bn' ? 'বক্তব্য জমা দিন' : 'Submit Statement'}`}
                </button>
              </div>
            </form>
          </div>

          {/* Action buttons */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onNavigateToCitizenPortal}
            >
              ← {t('citizen.backToPortal')}
            </button>
            {onViewFullDossier && (
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => onViewFullDossier(targetCaseId)}
              >
                🏛️ Open DLAO Operational Dossier
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
