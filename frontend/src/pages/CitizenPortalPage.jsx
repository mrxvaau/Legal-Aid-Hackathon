import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function CitizenPortalPage({ initialSearchId = null, onStartIntake, onViewCase }) {
  const { language, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState(initialSearchId || '16699-MALEK-7492');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [safeStatus, setSafeStatus] = useState(null);
  const [caseRecord, setCaseRecord] = useState(null);
  const [showUssdDemo, setShowUssdDemo] = useState(false);

  const fetchCaseStatus = async (idToSearch) => {
    const term = (idToSearch || searchTerm || '').trim();
    if (!term) return;

    setLoading(true);
    setError(null);
    setSafeStatus(null);
    setCaseRecord(null);

    try {
      // 1. Fetch through dedicated privacy-safe non-smartphone citizen status endpoint
      let statusData = null;
      try {
        const res = await api.getCitizenStatus(term);
        if (res.data) {
          statusData = res.data;
          setSafeStatus(statusData);
        }
      } catch (err) {
        // Fallback search
      }

      // 2. Fetch case list by search to retrieve provenance / safe contact if permitted
      try {
        const listRes = await api.getCases({ search: term });
        const found = listRes.data && listRes.data.length > 0 ? listRes.data[0] : null;
        if (found) {
          const detailRes = await api.getCase(found.id);
          setCaseRecord(detailRes.data);
        }
      } catch (e) {
        // Suppress if unauthorized or not found in list
      }

      if (!statusData && !caseRecord) {
        throw new Error(t('citizen.caseNotFound'));
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve case status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSearchId) {
      setSearchTerm(initialSearchId);
      fetchCaseStatus(initialSearchId);
    } else {
      fetchCaseStatus('16699-MALEK-7492');
    }
  }, [initialSearchId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCaseStatus(searchTerm);
  };

  const handleQuickLookup = (code) => {
    setSearchTerm(code);
    fetchCaseStatus(code);
  };

  // Derive plain-language provenance Q&A
  const getProvenanceQandA = () => {
    if (!caseRecord || !caseRecord.provenance || caseRecord.provenance.length === 0) {
      return null;
    }
    const provs = caseRecord.provenance;
    const spoken = provs.find(p => p.source_type === 'spoken_by_person');
    const translated = provs.find(p => p.source_type === 'translated');
    const confirmed = provs.find(p => p.confirmed_by || p.source_type === 'confirmed_by_human');
    const secondhand = provs.find(p => p.is_secondhand_report === 1);

    const whoProvided = secondhand
      ? `${caseRecord.applicant_name || 'Applicant'} (Original oral statement via representative)`
      : (spoken ? `${caseRecord.applicant_name || 'Applicant'} (Direct oral statement)` : (caseRecord.applicant_name || 'Applicant'));

    const whoSubmitted = secondhand
      ? (caseRecord.representative_name ? `${caseRecord.representative_name} (Authorized Representative)` : 'Authorized Representative')
      : `${caseRecord.applicant_name || 'Self'} (Applicant)`;

    const wasTrans = translated
      ? `Yes (${translated.source_language?.toUpperCase() || 'Language'} → Bangla translation recorded)`
      : 'No (Recorded directly in Bangla)';

    const wasConf = confirmed
      ? `Yes (Certified by Officer ${confirmed.confirmed_by || 'DLAO Staff'})`
      : 'Under review by Legal Aid Officer';

    return { whoProvided, whoSubmitted, wasTrans, wasConf };
  };

  const qa = getProvenanceQandA();
  const hasSafeContact = caseRecord && caseRecord.safe_contacts && caseRecord.safe_contacts.length > 0;

  return (
    <div className="citizen-portal-container" role="main">
      {/* Citizen Hero Header */}
      <div className="citizen-hero-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '32px' }} aria-hidden="true">🌱</span>
          <div>
            <h2 className="citizen-hero-title">{t('citizen.title')}</h2>
            <p className="citizen-hero-subtitle">{t('citizen.subtitle')}</p>
          </div>
        </div>

        <button
          type="button"
          className="btn-citizen-cta"
          onClick={onStartIntake}
          aria-label={t('citizen.startApplication')}
        >
          ✨ {t('citizen.startApplication')}
        </button>
      </div>

      {/* Mandatory Non-Smartphone Architecture Notice */}
      <div style={{
        background: '#F0FDF4',
        border: '1px solid #86EFAC',
        borderRadius: '8px',
        padding: '12px 18px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📱</span>
          <div>
            <strong style={{ color: '#166534', fontSize: '14px', display: 'block' }}>
              {t('nonSmartphone.prototypeTitle')}
            </strong>
            <span style={{ fontSize: '12px', color: '#15803D' }}>
              {t('nonSmartphone.simulationDisclaimer')}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn-secondary-sm"
          onClick={() => {
            setShowUssdDemo(!showUssdDemo);
            handleQuickLookup('16699-MALEK-7492');
          }}
          style={{ background: '#DCFCE7', color: '#166534', borderColor: '#86EFAC', fontWeight: '700' }}
        >
          📞 {t('nonSmartphone.ussdDialBtn')}
        </button>
      </div>

      {/* USSD Feature Phone Simulator Modal/Callout */}
      {showUssdDemo && (
        <div style={{
          background: '#1E293B',
          color: '#F8FAFC',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '16px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
          border: '2px solid #38BDF8'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '700' }}>
              📟 SIMULATED FEATURE PHONE USSD SESSION (*16699*7492#)
            </span>
            <button
              type="button"
              onClick={() => setShowUssdDemo(false)}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
          <div style={{
            background: '#0F172A',
            padding: '14px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#34D399',
            marginTop: '10px',
            lineHeight: '1.5'
          }}>
            [GOV LEGAL AID BD 16699]<br />
            Case: DLAO-SYL-2026-0048 (Abdul Malek)<br />
            Status: {safeStatus?.current_status_plain || 'Awaiting Action'}<br />
            Last Update: {safeStatus?.last_update || '2026-06-15'}<br />
            Next Step: DLAO Sylhet court proceeding follow-up.<br />
            Helpline: Dial 16699 toll-free or visit local Union Digital Center.<br />
            -- Simulated USSD Response --
          </div>
        </div>
      )}

      {/* Case Status Search Form */}
      <div className="citizen-search-box">
        <label htmlFor="case-search-input" className="citizen-search-label">
          🔍 {t('citizen.searchPrompt')}
        </label>
        <form onSubmit={handleSearchSubmit} className="citizen-search-form">
          <input
            id="case-search-input"
            type="text"
            className="citizen-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('citizen.searchPlaceholder')}
            aria-required="true"
          />
          <button
            type="submit"
            className="btn-citizen-primary"
            disabled={loading}
          >
            {loading ? t('common.loading') : t('citizen.searchBtn')}
          </button>
        </form>

        {/* Quick Click Sample Buttons for Demo Testing */}
        <div className="citizen-quick-pills" role="region" aria-label={t('citizen.quickSamples')}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
            {t('citizen.quickSamples')}:
          </span>
          <button
            type="button"
            className="quick-pill-btn"
            onClick={() => handleQuickLookup('16699-MALEK-7492')}
          >
            ⚖️ Abdul Malek (7-Mo Case / Inquiry Code)
          </button>
          <button
            type="button"
            className="quick-pill-btn"
            onClick={() => handleQuickLookup('APP-20260901-0001')}
          >
            🛡️ Moyuri Akter (Safe Contact)
          </button>
          <button
            type="button"
            className="quick-pill-btn"
            onClick={() => handleQuickLookup('APP-20260910-0003')}
          >
            🔐 Nabila (Cyber Abuse / PCSW)
          </button>
          <button
            type="button"
            className="quick-pill-btn"
            onClick={() => handleQuickLookup('APP-20260912-0004')}
          >
            🏔️ Nuching Marma (CHT Provenance)
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="citizen-alert-box error" role="alert">
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <strong>Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="citizen-loading-box" role="status" aria-live="polite">
          <div className="spinner" />
          <p>{t('common.loading')}</p>
        </div>
      )}

      {/* Sanitized Plain-Language Citizen Status Card */}
      {(safeStatus || caseRecord) && !loading && (
        <div className="citizen-status-card" role="region" aria-label="Case Status Dossier">
          {/* Top Identifier Row */}
          <div className="citizen-card-header">
            <div>
              <span className="citizen-badge-app">{safeStatus?.citizen_inquiry_code || caseRecord?.application_id}</span>
              <h3 className="citizen-case-number">
                {language === 'bn' 
                  ? (safeStatus?.title_bn || caseRecord?.title_bn || safeStatus?.case_number)
                  : (safeStatus?.title || caseRecord?.title || safeStatus?.case_number)}
              </h3>
              <p className="citizen-case-meta">
                Case No: <strong>{safeStatus?.case_number || caseRecord?.case_number}</strong> • Intake Office: <strong>{safeStatus?.assigned_office || caseRecord?.intake_office}</strong>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <StatusBadge status={safeStatus?.current_status || caseRecord?.status} />
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748B' }}>
                {t('nonSmartphone.caseAgeLabel')}: <strong>{language === 'bn' ? (safeStatus?.case_age_display_bn || '৭ মাস চলমান') : (safeStatus?.case_age_display || '~7 months active')}</strong>
              </div>
            </div>
          </div>

          {/* Safe Contact Notice (Citizen Safe UX) */}
          {hasSafeContact && (
            <div className="citizen-safe-shield-banner" role="status">
              <span style={{ fontSize: '22px' }}>🛡️</span>
              <div>
                <strong>{language === 'bn' ? 'নিরাপত্তা সুরক্ষা মোড সক্রিয়' : 'Contact Safety Protocol Active'}</strong>
                <p style={{ margin: '3px 0 0 0', fontSize: '13px' }}>
                  {t('citizen.safeActive')}
                </p>
              </div>
            </div>
          )}

          {/* Core Plain-Language Facts Grid */}
          <div className="citizen-facts-grid">
            <div className="citizen-fact-cell">
              <span className="fact-label">{t('nonSmartphone.plainStatusLabel')}:</span>
              <span className="fact-value highlight" style={{ fontSize: '14px', lineHeight: '1.4' }}>
                {language === 'bn' ? safeStatus?.current_status_plain_bn : safeStatus?.current_status_plain}
              </span>
            </div>

            <div className="citizen-fact-cell">
              <span className="fact-label">{t('nonSmartphone.nextActionLabel')}:</span>
              <span className="fact-value" style={{ fontSize: '14px', lineHeight: '1.4' }}>
                {language === 'bn' ? safeStatus?.next_action_bn : safeStatus?.next_action}
              </span>
            </div>

            <div className="citizen-fact-cell">
              <span className="fact-label">{t('nonSmartphone.assignedOfficeLabel')}:</span>
              <span className="fact-value">{safeStatus?.assigned_office || caseRecord?.intake_office}</span>
            </div>

            <div className="citizen-fact-cell">
              <span className="fact-label">{t('nonSmartphone.lastUpdateLabel')}:</span>
              <span className="fact-value">
                {language === 'bn' 
                  ? (safeStatus?.last_update_display_bn || safeStatus?.last_update)
                  : (safeStatus?.last_update_display || safeStatus?.last_update)}
              </span>
            </div>
          </div>

          {/* Lawyer Inactivity / Silence Advisory if applicable */}
          {(caseRecord?.lawyer_status === 'SILENT_UNRESPONSIVE' || caseRecord?.deadline_alert_level === 'CRITICAL_OVERDUE' || safeStatus?.current_status === 'WAITING_FOR_ACTION') && (
            <div className="citizen-lawyer-alert" role="alert" style={{ marginTop: '16px' }}>
              <span style={{ fontSize: '24px' }}>⚖️</span>
              <div>
                <strong>{t('lawyerAlert.silentWarning')}:</strong>
                <p style={{ margin: '4px 0', fontSize: '13px', color: '#7F1D1D' }}>
                  {language === 'bn' 
                    ? 'মামলার অগ্রগতি পর্যালোচনার জন্য জেলা লিগ্যাল এইড অফিসের বিশেষ তদারকি সেল দায়িত্ব গ্রহণ করেছে।'
                    : 'A formal case accountability review is currently underway by the District Legal Aid Officer.'}
                </p>
                <div style={{ marginTop: '6px', fontSize: '13px' }}>
                  {t('lawyerAlert.inquiryCode')}: <strong style={{ color: '#991B1B' }}>{safeStatus?.citizen_inquiry_code || caseRecord?.citizen_inquiry_code}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Non-Smartphone Safe Contact & Follow-up Instructions */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '12px 16px',
            marginTop: '16px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block' }}>
              📞 {t('nonSmartphone.followUpLabel')}:
            </span>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#334155' }}>
              {language === 'bn' ? safeStatus?.contact_follow_up_bn : safeStatus?.contact_follow_up}
            </p>
          </div>

          {/* Plain-Language Provenance Explanation if available */}
          {qa && (
            <div className="citizen-provenance-box" role="region" aria-label={t('citizen.provenanceTitle')} style={{ marginTop: '16px' }}>
              <h4 className="citizen-subheading">
                🔍 {t('citizen.provenanceTitle')}
              </h4>
              <div className="citizen-qa-list">
                <div className="qa-item">
                  <span className="qa-q">{t('citizen.whoProvided')}</span>
                  <span className="qa-a">👤 {qa.whoProvided}</span>
                </div>
                <div className="qa-item">
                  <span className="qa-q">{t('citizen.whoSubmitted')}</span>
                  <span className="qa-a">📝 {qa.whoSubmitted}</span>
                </div>
                <div className="qa-item">
                  <span className="qa-q">{t('citizen.wasTranslated')}</span>
                  <span className="qa-a">🌐 {qa.wasTrans}</span>
                </div>
                <div className="qa-item">
                  <span className="qa-q">{t('citizen.wasConfirmed')}</span>
                  <span className="qa-a">✅ {qa.wasConf}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action to view in full DLAO dossier if authorized */}
          {onViewCase && (caseRecord?.id || safeStatus?.case_number) && (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => onViewCase(caseRecord?.id || 'CASE-20260220-0005')}
              >
                🏛️ View Full Technical Dossier
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
