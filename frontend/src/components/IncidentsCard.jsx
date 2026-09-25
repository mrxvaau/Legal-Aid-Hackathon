import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

const SEVERITY_COLORS = {
  CRITICAL: { bg: '#FEE2E2', text: '#991B1B' },
  HIGH: { bg: '#FFEDD5', text: '#9A3412' },
  MEDIUM: { bg: '#FEF3C7', text: '#92400E' },
  LOW: { bg: '#F1F5F9', text: '#475569' }
};

export default function IncidentsCard({ caseId, incidents = [], onRefresh }) {
  const { language, t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    incident_type: 'DOMESTIC_VIOLENCE',
    incident_date: new Date().toISOString().slice(0, 10),
    location: '',
    description: '',
    description_bn: '',
    severity: 'MEDIUM',
    police_station_jurisdiction: '',
    gd_or_fir_number: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createCaseIncident(caseId, formData);
      setShowAddForm(false);
      setFormData({
        incident_type: 'DOMESTIC_VIOLENCE',
        incident_date: new Date().toISOString().slice(0, 10),
        location: '',
        description: '',
        description_bn: '',
        severity: 'MEDIUM',
        police_station_jurisdiction: '',
        gd_or_fir_number: ''
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-box">
      <div className="card-header">
        <div>
          <h3 className="card-title">🚨 {t('incidents.title')}</h3>
          <p className="card-subtitle">Chronological evidence and law enforcement coordination</p>
        </div>
        <button
          className="btn-secondary-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? t('common.cancel') : `+ ${t('incidents.linkIncident')}`}
        </button>
      </div>

      {error && <div className="inline-error">⚠️ {error}</div>}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="inline-form-box">
          <div className="form-grid-3">
            <div>
              <label className="form-label">{t('incidents.type')} *</label>
              <select
                className="form-input"
                value={formData.incident_type}
                onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
              >
                <option value="DOMESTIC_VIOLENCE">Domestic Violence</option>
                <option value="WAGE_THEFT">Wage Theft / Unpaid Dues</option>
                <option value="HARASSMENT">Workplace / Physical Harassment</option>
                <option value="LAND_DISPUTE">Illegal Land Encroachment / Eviction</option>
                <option value="EVICTION_THREAT">Threat of Unlawful Eviction</option>
                <option value="OTHER">Other Grievance</option>
              </select>
            </div>
            <div>
              <label className="form-label">{t('incidents.date')} *</label>
              <input
                type="date"
                required
                className="form-input"
                value={formData.incident_date}
                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">{t('incidents.location')} *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Mirpur 2, Dhaka"
              />
            </div>
          </div>

          <div className="form-grid-3" style={{ marginTop: '10px' }}>
            <div>
              <label className="form-label">{t('incidents.severity')} *</label>
              <select
                className="form-input"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="form-label">{t('incidents.policeJurisdiction')}</label>
              <input
                type="text"
                className="form-input"
                value={formData.police_station_jurisdiction}
                onChange={(e) => setFormData({ ...formData, police_station_jurisdiction: e.target.value })}
                placeholder="e.g. Mirpur Model Thana"
              />
            </div>
            <div>
              <label className="form-label">{t('incidents.gdFirNumber')}</label>
              <input
                type="text"
                className="form-input"
                value={formData.gd_or_fir_number}
                onChange={(e) => setFormData({ ...formData, gd_or_fir_number: e.target.value })}
                placeholder="e.g. GD-884/2026 or FIR-12/2021"
              />
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '10px' }}>
            <div>
              <label className="form-label">Description (EN) *</label>
              <textarea
                required
                rows="2"
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Incident facts and circumstances..."
              />
            </div>
            <div>
              <label className="form-label">Description (BN)</label>
              <textarea
                rows="2"
                className="form-input"
                value={formData.description_bn}
                onChange={(e) => setFormData({ ...formData, description_bn: e.target.value })}
                placeholder="ঘটনার বিবরণ (বাংলায়)..."
              />
            </div>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary-sm" onClick={() => setShowAddForm(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary-sm" disabled={submitting}>
              {submitting ? 'Linking...' : t('common.save')}
            </button>
          </div>
        </form>
      )}

      <div className="incident-list">
        {incidents.length === 0 ? (
          <p className="empty-hint">{t('common.none')}</p>
        ) : (
          incidents.map((inc) => {
            const sStyle = SEVERITY_COLORS[inc.severity] || SEVERITY_COLORS.MEDIUM;
            const displayDesc = language === 'bn' && inc.description_bn ? inc.description_bn : inc.description;

            return (
              <div key={inc.id} className="incident-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="incident-type-tag">{inc.incident_type}</span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '700',
                        backgroundColor: sStyle.bg,
                        color: sStyle.text
                      }}
                    >
                      {inc.severity}
                    </span>
                  </div>
                  <span className="incident-date">📅 {inc.incident_date}</span>
                </div>

                <div className="incident-meta">
                  <span>📍 {inc.location}</span>
                  {inc.police_station_jurisdiction && (
                    <span>👮 Thana: <strong>{inc.police_station_jurisdiction}</strong></span>
                  )}
                  {inc.gd_or_fir_number && (
                    <span className="gd-fir-badge">📄 GD/FIR: {inc.gd_or_fir_number}</span>
                  )}
                </div>

                <p className="incident-desc">{displayDesc}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
