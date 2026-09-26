import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function CaseListPage({ onSelectCase, onNewApplication }) {
  const { language, t } = useLanguage();
  const [cases, setCases] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'applications' | 'matrix'

  const loadCases = async (searchOverride = null) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      const query = searchOverride !== null ? searchOverride : searchTerm;
      if (query) params.search = query;
      if (statusFilter) params.status = statusFilter;
      
      const [caseRes, appRes] = await Promise.all([
        api.getCases(params),
        api.getApplications()
      ]);

      setCases(caseRes.data || []);
      setApplications(appRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCases();
  };

  const handleScenarioFilter = (term) => {
    setSearchTerm(term);
    loadCases(term);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    loadCases('');
  };

  return (
    <div className="page-container">
      {/* Page Title & Actions */}
      <div className="page-header-row">
        <div>
          <h2 className="page-title">{t('cases.caseListTitle')}</h2>
          <p className="page-subtitle">
            {language === 'bn' 
              ? 'বাস্তবায়িত ৪টি বাধ্যতামূলক নাগরিক দৃশ্যপট ও জাতীয় ডিজিটাল লিগ্যাল এইড সিস্টেম' 
              : 'Integrated National Digital Legal Aid System • 4 Mandatory Scenarios & Golden Thread Architecture'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={() => loadCases()}>
            🔄 {t('common.retry')}
          </button>
          <button className="btn-primary" onClick={onNewApplication}>
            ➕ {t('app.newApplication')}
          </button>
        </div>
      </div>

      {/* Jury Scenario Quick Filter Ribbon */}
      <div className="scenario-ribbon">
        <div className="ribbon-label">
          🎯 <strong>{language === 'bn' ? 'বাধ্যতামূলক নাগরিক দৃশ্যপটসমূহ:' : 'Mandatory Citizen Scenarios:'}</strong>
        </div>
        <div className="ribbon-buttons">
          <button
            className={`scenario-pill-btn ${searchTerm === 'Moyuri' ? 'active' : ''}`}
            onClick={() => handleScenarioFilter('Moyuri')}
          >
            🛡️ 1. Moyuri & Ripon (Safe Contact & Non-Visual Intake)
          </button>
          <button
            className={`scenario-pill-btn ${searchTerm === 'Nuching' ? 'active' : ''}`}
            onClick={() => handleScenarioFilter('Nuching')}
          >
            🏔️ 2. Nuching Marma (Indigenous CHT & UDC Sync)
          </button>
          <button
            className={`scenario-pill-btn ${searchTerm === 'Nabila' ? 'active' : ''}`}
            onClick={() => handleScenarioFilter('Nabila')}
          >
            🚨 3. Nabila (Sensitive Cyber Abuse & PCSW Referral)
          </button>
          <button
            className={`scenario-pill-btn ${searchTerm === 'Malek' ? 'active' : ''}`}
            onClick={() => handleScenarioFilter('Malek')}
          >
            ⚖️ 4. Abdul Malek (~7-Mo Case & Lawyer Accountability)
          </button>
          {searchTerm && (
            <button
              className="scenario-pill-btn"
              onClick={clearFilters}
              style={{ background: '#F1F5F9', color: '#64748B' }}
            >
              ✕ {language === 'bn' ? 'সব দেখুন' : 'Show All'}
            </button>
          )}
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="dossier-tabs" style={{ marginBottom: '18px' }}>
        <button
          className={`tab-btn ${activeTab === 'cases' ? 'active' : ''}`}
          onClick={() => setActiveTab('cases')}
        >
          📂 {t('cases.casesTab')} ({cases.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          📋 {t('cases.applicationsTab')} ({applications.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('matrix')}
          style={{ borderColor: '#0D9488', color: '#0F766E', fontWeight: '700' }}
        >
          🔗 {t('cases.matrixTab')} (4 Scenarios)
        </button>
      </div>

      {/* Filter and Search Bar (For Cases and Applications) */}
      {activeTab !== 'matrix' && (
        <div className="filters-bar">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              className="form-input search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('cases.searchPlaceholder')}
            />
            <button type="submit" className="btn-primary">
              🔍 Search
            </button>
          </form>

          {activeTab === 'cases' && (
            <div className="status-filter-wrapper">
              <label className="form-label" style={{ marginBottom: 0 }}>
                {t('cases.status')}:
              </label>
              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="">All States (সব অবস্থা)</option>
                <option value="NEW">NEW</option>
                <option value="INTAKE">INTAKE</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="REFERRED">REFERRED</option>
                <option value="MEDIATION">MEDIATION</option>
                <option value="SETTLEMENT_DRAFT">SETTLEMENT_DRAFT</option>
                <option value="WAITING_FOR_ACTION">WAITING_FOR_ACTION</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="error-banner">
          ⚠️ <strong>{t('common.error')}:</strong> {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      ) : (
        <>
          {/* TAB 1: CASES DOSSIERS */}
          {activeTab === 'cases' && (
            cases.length === 0 ? (
              <div className="empty-state">
                <p>No cases found matching the criteria.</p>
              </div>
            ) : (
              <div className="case-grid">
                {cases.map((c) => {
                  const applicantName = language === 'bn' && c.applicant_name_bn ? c.applicant_name_bn : c.applicant_name;
                  const displayTitle = language === 'bn' && c.title_bn ? c.title_bn : c.title;

                  return (
                    <div key={c.id} className="case-card" onClick={() => onSelectCase(c.id)}>
                      <div className="case-card-header">
                        <div>
                          <span className="case-trace-tag">
                            🔗 App Trace: <strong>{c.application_id}</strong>
                          </span>
                          <h3 className="case-number-heading">{c.case_number}</h3>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>

                      <h4 className="case-title-text">{displayTitle}</h4>

                      <div className="case-card-details">
                        <div className="detail-item">
                          <span className="detail-label">{t('cases.applicant')}:</span>
                          <span className="detail-value">{applicantName}</span>
                        </div>

                        {c.representative_name && (
                          <div className="detail-item">
                            <span className="detail-label">Rep:</span>
                            <span className="detail-value rep-highlight">
                              👤 {c.representative_name} (Auth Rep)
                            </span>
                          </div>
                        )}

                        <div className="detail-item">
                          <span className="detail-label">{t('cases.office')}:</span>
                          <span className="detail-value">{c.intake_office}</span>
                        </div>

                        {c.assigned_lawyer_name && (
                          <div className="detail-item">
                            <span className="detail-label">{t('cases.assignedLawyer')}:</span>
                            <span className="detail-value">
                              ⚖️ {c.assigned_lawyer_name}
                              {c.lawyer_status === 'SILENT_UNRESPONSIVE' && (
                                <span style={{ color: '#DC2626', fontWeight: '800', marginLeft: '6px' }}>⚠️ SILENT</span>
                              )}
                            </span>
                          </div>
                        )}

                        <div className="detail-item">
                          <span className="detail-label">{t('cases.category')}:</span>
                          <span className="category-pill">{c.category}</span>
                        </div>
                      </div>

                      <div className="case-card-footer">
                        <span className="case-date">
                          📅 {new Date(c.created_at).toLocaleDateString()}
                        </span>
                        <button className="btn-view-dossier">
                          {t('cases.viewDetails')} ➔
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: INTAKE APPLICATIONS */}
          {activeTab === 'applications' && (
            applications.length === 0 ? (
              <div className="empty-state">
                <p>{t('cases.noAppsFound')}</p>
              </div>
            ) : (
              <div className="applications-grid">
                {applications.map((app) => (
                  <div key={app.id} className="app-card">
                    <div>
                      <div className="app-card-header">
                        <div>
                          <div className="app-id-heading">📋 {app.id}</div>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            Created: {new Date(app.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="app-channel-tag">{app.intake_channel}</span>
                      </div>

                      <div className="app-summary-text">
                        <strong>Intake Summary:</strong> {app.summary}
                      </div>

                      <div className="app-meta-box">
                        <div><strong>Applicant:</strong> {app.applicant_name} ({app.applicant_phone || 'Protected'})</div>
                        {app.representative_name && (
                          <div style={{ color: '#1E40AF', marginTop: '2px' }}>
                            <strong>Authorized Representative:</strong> 👤 {app.representative_name}
                          </div>
                        )}
                        <div style={{ marginTop: '2px' }}><strong>Office:</strong> {app.intake_office}</div>
                        <div style={{ marginTop: '2px' }}><strong>Category:</strong> {app.category}</div>
                      </div>
                    </div>

                    <div className="app-card-footer">
                      <div>
                        {app.linked_case_number ? (
                          <span style={{ fontSize: '12px', color: '#0F766E', fontWeight: '700' }}>
                            🔗 Converted: {app.linked_case_number}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748B' }}>Status: {app.status}</span>
                        )}
                      </div>

                      {app.linked_case_id ? (
                        <button
                          type="button"
                          className="btn-open-linked-case"
                          onClick={() => onSelectCase(app.linked_case_id)}
                        >
                          {t('cases.openLinkedCase')} ➔
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>No Case Assigned</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 3: GOLDEN THREAD ARCHITECTURAL MATRIX */}
          {activeTab === 'matrix' && (
            <div style={{ marginTop: '8px' }}>
              <div className="jury-scenario-banner">
                <div className="jury-banner-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#38BDF8' }}>
                      ⚖️ ADLASB National Digital Legal Aid System — Grand Finale Architecture
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94A3B8' }}>
                      One unified, continuous platform serving 4 mandatory citizen scenarios across 7 institutional provider roles.
                    </p>
                  </div>
                </div>

                <div className="jury-scenarios-grid">
                  {/* Scenario 1 */}
                  <div className="jury-scenario-item" onClick={() => onSelectCase('CASE-20260901-0001')}>
                    <div className="jury-scenario-title">🛡️ 1. Moyuri Akter + Ripon</div>
                    <div className="jury-scenario-desc">
                      Domestic violence survivor; safe contact mode active; brother Ripon (blind, voice-first) authorized representative; secondhand reporting provenance.
                    </div>
                    <div className="jury-scenario-target">
                      App APP-20260901-0001 ➔ Case DLAO-DHK-2026-0042 [Open Dossier ➔]
                    </div>
                  </div>

                  {/* Scenario 2 */}
                  <div className="jury-scenario-item" onClick={() => onSelectCase('CASE-20260912-0004')}>
                    <div className="jury-scenario-title">🏔️ 2. Nuching Marma</div>
                    <div className="jury-scenario-desc">
                      Indigenous CHT ancestral land dispute; Marma oral statement; UDC-assisted translation; 5-stage provenance; offline sync with conflict resolution.
                    </div>
                    <div className="jury-scenario-target">
                      App APP-20260912-0004 ➔ Case DLAO-RNG-2026-0014 [Open Dossier ➔]
                    </div>
                  </div>

                  {/* Scenario 3 */}
                  <div className="jury-scenario-item" onClick={() => onSelectCase('CASE-20260910-0003')}>
                    <div className="jury-scenario-title">🚨 3. Nabila</div>
                    <div className="jury-scenario-desc">
                      Digital harassment & non-consensual altered images; strictly restricted cryptographic evidence vault; urgent PCSW CID HQ referral with tracked ownership.
                    </div>
                    <div className="jury-scenario-target">
                      App APP-20260910-0003 ➔ Case DLAO-DHK-2026-0914 [Open Dossier ➔]
                    </div>
                  </div>

                  {/* Scenario 4 */}
                  <div className="jury-scenario-item" onClick={() => onSelectCase('CASE-20260220-0005')}>
                    <div className="jury-scenario-title">⚖️ 4. Abdul Malek</div>
                    <div className="jury-scenario-desc">
                      Elderly smallholder farmer; ~7-month-old dispute; panel lawyer silent (102 days); statutory overdue escalation; non-smartphone citizen inquiry (USSD/16699).
                    </div>
                    <div className="jury-scenario-target">
                      App APP-20260220-0005 ➔ Case DLAO-SYL-2026-0048 [Open Dossier ➔]
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
