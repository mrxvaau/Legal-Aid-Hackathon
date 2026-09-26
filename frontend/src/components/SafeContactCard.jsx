import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

const DANGER_LEVEL_STYLE = {
  LOW: { bg: '#E0F2FE', text: '#0369A1', label: 'LOW RISK' },
  MEDIUM: { bg: '#FEF3C7', text: '#B45309', label: 'MEDIUM RISK' },
  HIGH: { bg: '#FEE2E2', text: '#B91C1C', label: 'HIGH RISK (IMMEDIATE)' },
  CRITICAL: { bg: '#7F1D1D', text: '#FFFFFF', label: 'CRITICAL / LIFE SAFETY' }
};

export default function SafeContactCard({ caseId, safeContacts = [], onRefresh }) {
  const { language, t } = useLanguage();
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    preferred_contact_method: 'IN_PERSON_REPRESENTATIVE',
    unsafe_channels: ['PRIMARY_PHONE', 'DIRECT_SMS'],
    safe_channel_details: '',
    restriction_reason: '',
    danger_level: 'HIGH'
  });

  const handleToggleChannel = (channel) => {
    setFormData((prev) => {
      const exists = prev.unsafe_channels.includes(channel);
      return {
        ...prev,
        unsafe_channels: exists
          ? prev.unsafe_channels.filter((c) => c !== channel)
          : [...prev.unsafe_channels, channel]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.configureSafeContact(caseId, {
        preferred_contact_method: formData.preferred_contact_method,
        unsafe_channels: formData.unsafe_channels,
        safe_channel_details: formData.safe_channel_details,
        restriction_reason: formData.restriction_reason,
        danger_level: formData.danger_level
      });
      setShowConfigForm(false);
      setFormData({
        preferred_contact_method: 'IN_PERSON_REPRESENTATIVE',
        unsafe_channels: ['PRIMARY_PHONE', 'DIRECT_SMS'],
        safe_channel_details: '',
        restriction_reason: '',
        danger_level: 'HIGH'
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to configure safe contact');
    } finally {
      setSubmitting(false);
    }
  };

  const hasSafeContacts = safeContacts && safeContacts.length > 0;

  return (
    <div className={`card-box ${hasSafeContacts ? 'safe-contact-active-card' : ''}`}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>🛡️</span>
          <div>
            <h3 className="card-title">{t('safeContact.title')}</h3>
            <p className="card-subtitle">
              {hasSafeContacts
                ? (language === 'bn' ? 'সুরক্ষিত যোগাযোগ মোড সক্রিয় — ভুক্তভোগী সুরক্ষা প্রটোকল' : 'Survivor Safe Communication Protocol Active')
                : (language === 'bn' ? 'অসুরক্ষিত পরিস্থিতিতে নিরাপদ যোগাযোগ চ্যানেল নির্ধারণ' : 'Confidential contact routing for vulnerable applicants')}
            </p>
          </div>
        </div>
        <button
          className="btn-secondary-sm"
          onClick={() => setShowConfigForm(!showConfigForm)}
        >
          {showConfigForm ? t('common.cancel') : `+ ${t('safeContact.configure')}`}
        </button>
      </div>

      {error && <div className="inline-error">⚠️ {error}</div>}

      {/* Configure Safe Contact Form */}
      {showConfigForm && (
        <form onSubmit={handleSubmit} className="inline-form-box" style={{ background: '#FFFBEB', borderColor: '#F59E0B' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#92400E', fontSize: '14px', fontWeight: '700' }}>
            🛡️ {t('safeContact.configure')}
          </h4>
          <div className="form-grid-2">
            <div>
              <label className="form-label">{t('safeContact.preferredMethod')} *</label>
              <select
                className="form-input"
                value={formData.preferred_contact_method}
                onChange={(e) => setFormData({ ...formData, preferred_contact_method: e.target.value })}
              >
                <option value="IN_PERSON_REPRESENTATIVE">In-Person Authorized Representative (অনুমোদিত প্রতিনিধি)</option>
                <option value="ALTERNATIVE_PHONE">Alternative Confidential Phone (বিকল্প গোপনীয় ফোন)</option>
                <option value="SECURE_OFFICE_VISIT">Scheduled DLAO Office Visit Only (নির্ধারিত অফিস সাক্ষাৎ)</option>
                <option value="COMMUNITY_PARALEGAL">Confidential Community Paralegal (প্যারা-লিগ্যাল প্রতিনিধি)</option>
              </select>
            </div>
            <div>
              <label className="form-label">{t('safeContact.dangerLevel')} *</label>
              <select
                className="form-input"
                value={formData.danger_level}
                onChange={(e) => setFormData({ ...formData, danger_level: e.target.value })}
              >
                <option value="HIGH">High Immediate Risk (উচ্চ তাৎক্ষণিক ঝুঁকি)</option>
                <option value="CRITICAL">Critical / Life Threat (চরম জীবনহানি ঝুঁকি)</option>
                <option value="MEDIUM">Medium Precautionary (সতর্কতামূলক মধ্যম ঝুঁকি)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label className="form-label">{t('safeContact.unsafeChannels')} (Strictly Restricted):</label>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.unsafe_channels.includes('PRIMARY_PHONE')}
                  onChange={() => handleToggleChannel('PRIMARY_PHONE')}
                />
                Primary Phone (আবেদনকারীর মূল ফোন)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.unsafe_channels.includes('DIRECT_SMS')}
                  onChange={() => handleToggleChannel('DIRECT_SMS')}
                />
                Direct SMS (সরাসরি এসএমএস)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.unsafe_channels.includes('UNSCHEDULED_HOME_VISIT')}
                  onChange={() => handleToggleChannel('UNSCHEDULED_HOME_VISIT')}
                />
                Unscheduled Home Visit (না জানিয়ে বাড়ি পরিদর্শন)
              </label>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label className="form-label">{t('safeContact.safeDetails')} *</label>
            <textarea
              required
              rows={2}
              className="form-input"
              value={formData.safe_channel_details}
              onChange={(e) => setFormData({ ...formData, safe_channel_details: e.target.value })}
              placeholder="e.g. Contact brother Ripon at 01822000102. NEVER call applicant direct number as perpetrator monitors all incoming calls."
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <label className="form-label">{t('safeContact.restrictionReason')} *</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.restriction_reason}
              onChange={(e) => setFormData({ ...formData, restriction_reason: e.target.value })}
              placeholder="e.g. Perpetrator husband confiscated NID and monitors phone."
            />
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary-sm" onClick={() => setShowConfigForm(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary-sm" disabled={submitting}>
              {submitting ? 'Configuring...' : t('common.save')}
            </button>
          </div>
        </form>
      )}

      {/* Safe Contacts Display */}
      {!hasSafeContacts ? (
        <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '6px', fontSize: '13px', color: '#64748B' }}>
          ℹ️ {language === 'bn' ? 'কোনো সুরক্ষিত যোগাযোগ প্রটোকল সক্রিয় নেই। সাধারণ যোগাযোগ চ্যানেল কার্যকর রয়েছে।' : 'No safe contact protocol active. Standard communication channels are in effect.'}
        </div>
      ) : (
        <div className="safe-contacts-list">
          {safeContacts.map((sc) => {
            const dangerStyle = DANGER_LEVEL_STYLE[sc.danger_level] || DANGER_LEVEL_STYLE.HIGH;
            return (
              <div key={sc.id} className="safe-contact-card-item">
                {/* Threat Banner */}
                <div className="safe-contact-alert-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    <strong>{t('safeContact.activeAlert')}</strong>
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '800',
                      backgroundColor: dangerStyle.bg,
                      color: dangerStyle.text
                    }}
                  >
                    {dangerStyle.label}
                  </span>
                </div>

                {/* Restricted Unsafe Channels */}
                <div style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#DC2626' }}>
                    🚫 {t('safeContact.unsafeChannels')}:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {(Array.isArray(sc.unsafe_channels) ? sc.unsafe_channels : []).map((ch) => (
                      <span key={ch} className="unsafe-channel-tag">
                        ✖ {ch.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preferred Method & Instructions */}
                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <div className="safe-detail-box">
                    <span className="meta-label">{t('safeContact.preferredMethod')}:</span>
                    <span className="safe-method-badge">
                      ✓ {sc.preferred_contact_method?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="safe-detail-box">
                    <span className="meta-label">{t('safeContact.restrictionReason')}:</span>
                    <span style={{ fontSize: '13px', color: '#334155' }}>
                      {sc.restriction_reason}
                    </span>
                  </div>
                </div>

                {/* Safe Channel Details or Privacy Shield */}
                <div style={{ marginTop: '12px' }}>
                  <span className="meta-label">{t('safeContact.safeDetails')}:</span>
                  {sc.is_masked ? (
                    <div className="safe-contact-redacted-box">
                      🔒 <strong>{t('safeContact.redactedNotice')}</strong>
                    </div>
                  ) : (
                    <div className="safe-contact-unmasked-box">
                      📞 <strong>{sc.safe_channel_details}</strong>
                    </div>
                  )}
                </div>

                {/* Audit & provenance footer */}
                <div className="safe-contact-footer">
                  <span>
                    <strong>{t('safeContact.configuredBy')}:</strong> {sc.configured_by_id} ({sc.configured_by_role})
                  </span>
                  <span>{new Date(sc.created_at).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
