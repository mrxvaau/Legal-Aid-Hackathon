import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

export default function ReferralsCard({ caseId, referrals = [], onRefresh }) {
  const { language, t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    referral_type: 'DLAO_TO_DLAO',
    referring_office: 'DLAO Dhaka',
    receiving_office: 'DLAO Chattogram',
    reason: '',
    reason_bn: '',
    notes: ''
  });
  const [acceptingId, setAcceptingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleAccept = async (refId) => {
    setAcceptingId(refId);
    setError(null);
    try {
      await api.acceptCaseReferral(caseId, refId);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createCaseReferral(caseId, formData);
      setShowAddForm(false);
      setFormData({
        referral_type: 'DLAO_TO_DLAO',
        referring_office: 'DLAO Dhaka',
        receiving_office: 'DLAO Chattogram',
        reason: '',
        reason_bn: '',
        notes: ''
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
          <h3 className="card-title">🔄 {t('referrals.title')}</h3>
          <p className="card-subtitle">Cross-district transfer and multi-institutional routing</p>
        </div>
        <button
          className="btn-secondary-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? t('common.cancel') : `+ ${t('referrals.createReferral')}`}
        </button>
      </div>

      {error && <div className="inline-error">⚠️ {error}</div>}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="inline-form-box">
          <div className="form-grid-3">
            <div>
              <label className="form-label">{t('referrals.referralType')} *</label>
              <select
                className="form-input"
                value={formData.referral_type}
                onChange={(e) => setFormData({ ...formData, referral_type: e.target.value })}
              >
                <option value="DLAO_TO_DLAO">DLAO to DLAO (Inter-district)</option>
                <option value="INTERNAL_TRANSFER">Internal DLAO Transfer</option>
                <option value="POLICE_FORWARDING">Police Station Forwarding</option>
                <option value="SOCIAL_SERVICES">Social Welfare / One-Stop Crisis</option>
                <option value="NGO_LEGAL_CLINIC">Partner Legal NGO Clinic</option>
              </select>
            </div>
            <div>
              <label className="form-label">{t('referrals.fromOffice')} *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.referring_office}
                onChange={(e) => setFormData({ ...formData, referring_office: e.target.value })}
                placeholder="e.g. DLAO Dhaka"
              />
            </div>
            <div>
              <label className="form-label">{t('referrals.toOffice')} *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.receiving_office}
                onChange={(e) => setFormData({ ...formData, receiving_office: e.target.value })}
                placeholder="e.g. DLAO Chattogram"
              />
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '10px' }}>
            <div>
              <label className="form-label">{t('referrals.reason')} (EN) *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Legal basis or cross-district assistance required"
              />
            </div>
            <div>
              <label className="form-label">{t('referrals.reason')} (BN)</label>
              <input
                type="text"
                className="form-input"
                value={formData.reason_bn}
                onChange={(e) => setFormData({ ...formData, reason_bn: e.target.value })}
                placeholder="রেফারেলের কারণ (বাংলায়)"
              />
            </div>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary-sm" onClick={() => setShowAddForm(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary-sm" disabled={submitting}>
              {submitting ? 'Transmitting...' : t('common.save')}
            </button>
          </div>
        </form>
      )}

      <div className="referral-list">
        {referrals.length === 0 ? (
          <p className="empty-hint">{t('common.none')}</p>
        ) : (
          referrals.map((ref) => {
            const isPending = ref.status === 'PENDING' || ref.status === 'TRANSMITTED';
            const displayReason = language === 'bn' && ref.reason_bn ? ref.reason_bn : ref.reason;

            return (
              <div key={ref.id} className="referral-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={`ref-status-badge ${ref.status.toLowerCase()}`}>
                        {ref.status}
                      </span>
                      <span className="ref-type-badge">{ref.referral_type}</span>
                    </div>
                    <div className="ref-routing">
                      🏛️ <strong>{ref.referring_office}</strong> ➔ 🏢 <strong>{ref.receiving_office}</strong>
                    </div>
                  </div>

                  {isPending && (
                    <button
                      className="btn-confirm-sm"
                      disabled={acceptingId === ref.id}
                      onClick={() => handleAccept(ref.id)}
                    >
                      {acceptingId === ref.id ? 'Processing...' : `✓ ${t('referrals.accept')}`}
                    </button>
                  )}
                </div>

                <p className="ref-reason">
                  <strong>Reason:</strong> {displayReason}
                </p>

                {ref.notes && <p className="ref-notes">📝 {ref.notes}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
