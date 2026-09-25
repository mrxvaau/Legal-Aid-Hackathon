import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function CaseListPage({ onSelectCase, onNewApplication }) {
  const { language, t } = useLanguage();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      const res = await api.getCases(params);
      setCases(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load cases');
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

  return (
    <div className="page-container">
      {/* Page Title & Actions */}
      <div className="page-header-row">
        <div>
          <h2 className="page-title">{t('cases.caseListTitle')}</h2>
          <p className="page-subtitle">
            {language === 'bn' 
              ? 'বাস্তবায়িত ৫টি বাধ্যতামূলক নাগরিক দৃশ্যপট ও চলমান আইনি মামলাসমূহ' 
              : 'Implemented 5 Mandatory Citizen Scenarios & Active Legal Aid Proceedings'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={loadCases}>
            🔄 {t('common.retry')}
          </button>
          <button className="btn-primary" onClick={onNewApplication}>
            ➕ {t('app.newApplication')}
          </button>
        </div>
      </div>

      {/* Mandatory Scenarios Quick Filter Ribbon */}
      <div className="scenario-ribbon">
        <div className="ribbon-label">
          🎯 <strong>Mandatory Citizen Scenarios:</strong>
        </div>
        <div className="ribbon-buttons">
          <button
            className="scenario-pill-btn"
            onClick={() => setSearchTerm('Moyuri')}
          >
            1. Moyuri Akter (DV & Maintenance)
          </button>
          <button
            className="scenario-pill-btn"
            onClick={() => setSearchTerm('Ripon')}
          >
            2. Ripon (Authorized Representative)
          </button>
          <button
            className="scenario-pill-btn"
            onClick={() => setSearchTerm('Nabila')}
          >
            3. Nabila (Garment Worker, Helpline)
          </button>
          <button
            className="scenario-pill-btn"
            onClick={() => setSearchTerm('Nuching')}
          >
            4. Nuching Marma (Indigenous CHT)
          </button>
          <button
            className="scenario-pill-btn"
            onClick={() => setSearchTerm('Malek')}
          >
            5. Abdul Malek (Long Dispute, 5+ yrs)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
      </div>

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
      ) : cases.length === 0 ? (
        <div className="empty-state">
          <p>No cases found matching the criteria.</p>
        </div>
      ) : (
        /* Cases Table / Cards Grid */
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
                      <span className="detail-value">⚖️ {c.assigned_lawyer_name}</span>
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
      )}
    </div>
  );
}
