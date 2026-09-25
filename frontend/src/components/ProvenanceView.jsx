import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import ProvenanceBadge from './ProvenanceBadge';
import api from '../services/api';

export default function ProvenanceView({ caseId, provenance = [], onRefresh }) {
  const { t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    field_name: 'intake_statement',
    source_type: 'spoken_by_person',
    source_language: 'bn',
    target_language: 'bn',
    raw_content: '',
    processed_content: '',
    source_details: ''
  });
  const [confirmingId, setConfirmingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async (provId) => {
    setConfirmingId(provId);
    setError(null);
    try {
      await api.confirmProvenance(caseId, provId);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createCaseEvent(caseId, {
        action: 'PROVENANCE_RECORDED',
        notes: `Recorded provenance for ${formData.field_name} (${formData.source_type})`
      });

      // Direct provenance call
      const res = await fetch(`/api/cases/${caseId}/provenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': localStorage.getItem('adlasb_active_role') || 'B1_DLAO_OFFICER',
          'x-user-id': 'USR-PROV'
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to record provenance');
      }

      setShowAddForm(false);
      setFormData({
        field_name: 'intake_statement',
        source_type: 'spoken_by_person',
        source_language: 'bn',
        target_language: 'bn',
        raw_content: '',
        processed_content: '',
        source_details: ''
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
          <h3 className="card-title">🔍 {t('provenance.title')}</h3>
          <p className="card-subtitle">{t('provenance.subtitle')}</p>
        </div>
        <button
          className="btn-secondary-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? t('common.cancel') : '+ Record Provenance'}
        </button>
      </div>

      {error && <div className="inline-error">⚠️ {error}</div>}

      {/* Record Provenance Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="inline-form-box">
          <div className="form-grid-3">
            <div>
              <label className="form-label">Field Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.field_name}
                onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                placeholder="e.g. translated_narrative, eligibility_score"
              />
            </div>
            <div>
              <label className="form-label">Source Type *</label>
              <select
                className="form-input"
                value={formData.source_type}
                onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
              >
                <option value="spoken_by_person">Spoken by Person</option>
                <option value="typed_by_person">Typed by Person</option>
                <option value="typed_by_staff">Typed by Staff</option>
                <option value="translated">Translated</option>
                <option value="ai_assisted">AI-Assisted</option>
                <option value="inferred">Inferred</option>
                <option value="confirmed_by_human">Confirmed by Human</option>
              </select>
            </div>
            <div>
              <label className="form-label">Languages (Source → Target)</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={formData.source_language}
                  onChange={(e) => setFormData({ ...formData, source_language: e.target.value })}
                  placeholder="e.g. marma, bn"
                />
                <span style={{ alignSelf: 'center' }}>→</span>
                <input
                  type="text"
                  className="form-input"
                  value={formData.target_language}
                  onChange={(e) => setFormData({ ...formData, target_language: e.target.value })}
                  placeholder="e.g. bn, en"
                />
              </div>
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '10px' }}>
            <div>
              <label className="form-label">Raw Statement / Original Content</label>
              <textarea
                className="form-input"
                rows="2"
                value={formData.raw_content}
                onChange={(e) => setFormData({ ...formData, raw_content: e.target.value })}
                placeholder="Exact statement or raw prompt input..."
              />
            </div>
            <div>
              <label className="form-label">Processed Content / Output</label>
              <textarea
                className="form-input"
                rows="2"
                value={formData.processed_content}
                onChange={(e) => setFormData({ ...formData, processed_content: e.target.value })}
                placeholder="Translated, staff-entered, or AI-synthesized output..."
              />
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <label className="form-label">Source Details / Tool Reference</label>
            <input
              type="text"
              className="form-input"
              value={formData.source_details}
              onChange={(e) => setFormData({ ...formData, source_details: e.target.value })}
              placeholder="e.g. Translator: Minu Akhter (UDC) or Model: ADLASB-LegalLLM"
            />
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary-sm" onClick={() => setShowAddForm(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary-sm" disabled={submitting}>
              {submitting ? 'Recording...' : t('common.save')}
            </button>
          </div>
        </form>
      )}

      {/* Provenance Entry Cards */}
      <div className="provenance-trail">
        {provenance.length === 0 ? (
          <p className="empty-hint">{t('common.none')}</p>
        ) : (
          provenance.map((prov) => {
            const isConfirmed = Boolean(prov.confirmed_by);
            return (
              <div key={prov.id} className="prov-card">
                <div className="prov-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <ProvenanceBadge source={prov.source_type} isConfirmed={isConfirmed} />
                    <span className="prov-field-name">Target Field: <strong>{prov.field_name}</strong></span>
                    {prov.source_language && (
                      <span className="prov-lang-tag">
                        🌐 {prov.source_language.toUpperCase()} → {(prov.target_language || 'BN').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="prov-author">
                      By: <strong>{prov.author_role}</strong> ({prov.author_id || 'System'})
                    </span>
                    <span className="prov-time">
                      {new Date(prov.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="prov-body">
                  {prov.raw_content && (
                    <div className="prov-content-block">
                      <div className="prov-content-label">{t('provenance.rawContent')}:</div>
                      <div className="prov-raw-text">"{prov.raw_content}"</div>
                    </div>
                  )}
                  {prov.processed_content && (
                    <div className="prov-content-block">
                      <div className="prov-content-label">{t('provenance.processedContent')}:</div>
                      <div className="prov-processed-text">"{prov.processed_content}"</div>
                    </div>
                  )}
                  {prov.source_details && (
                    <div className="prov-details-meta">
                      ℹ️ {typeof prov.source_details === 'object' ? JSON.stringify(prov.source_details) : prov.source_details}
                    </div>
                  )}
                </div>

                <div className="prov-footer">
                  {isConfirmed ? (
                    <div className="prov-confirmed-box">
                      ✅ {t('provenance.confirmed_by_human')} by <strong>{prov.confirmed_by}</strong> on {new Date(prov.confirmed_at).toLocaleDateString()}
                    </div>
                  ) : (
                    <div className="prov-pending-box">
                      <span>⏳ {t('provenance.unconfirmed')}</span>
                      <button
                        className="btn-confirm-sm"
                        disabled={confirmingId === prov.id}
                        onClick={() => handleConfirm(prov.id)}
                      >
                        {confirmingId === prov.id ? 'Confirming...' : `✓ ${t('provenance.confirmAction')}`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
