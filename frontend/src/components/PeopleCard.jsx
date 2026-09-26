import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

const ROLE_BADGE_STYLE = {
  APPLICANT: { bg: '#DBEAFE', text: '#1E40AF', labelEn: 'Primary Applicant', labelBn: 'মূল আবেদনকারী' },
  AUTHORIZED_REPRESENTATIVE: { bg: '#FEF3C7', text: '#92400E', labelEn: 'Authorized Representative', labelBn: 'অনুমোদিত প্রতিনিধি' },
  OPPOSING_PARTY: { bg: '#FEE2E2', text: '#991B1B', labelEn: 'Opposing Party / Respondent', labelBn: 'বিপক্ষ পক্ষ' },
  PANEL_LAWYER: { bg: '#F3E8FF', text: '#6B21A8', labelEn: 'Panel Lawyer', labelBn: 'প্যানেল আইনজীবী' },
  MEDIATOR: { bg: '#CCFBF1', text: '#115E59', labelEn: 'Mediator', labelBn: 'সালিশকারী' },
  WITNESS: { bg: '#E2E8F0', text: '#334155', labelEn: 'Witness', labelBn: 'সাক্ষী' }
};

export default function PeopleCard({ caseId, people = [], onRefresh }) {
  const { language, t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    full_name_bn: '',
    role_in_case: 'OPPOSING_PARTY',
    relationship_to_applicant: 'OTHER',
    phone: '',
    district: 'Dhaka',
    division: 'Dhaka',
    authorization_doc_ref: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.addCasePerson(caseId, {
        person: {
          full_name: formData.full_name,
          full_name_bn: formData.full_name_bn || null,
          phone: formData.phone || null,
          district: formData.district,
          division: formData.division
        },
        role_in_case: formData.role_in_case,
        relationship_to_applicant: formData.relationship_to_applicant,
        authorization_doc_ref: formData.authorization_doc_ref || null,
        notes: formData.notes || null
      });
      setShowAddForm(false);
      setFormData({
        full_name: '',
        full_name_bn: '',
        role_in_case: 'OPPOSING_PARTY',
        relationship_to_applicant: 'OTHER',
        phone: '',
        district: 'Dhaka',
        division: 'Dhaka',
        authorization_doc_ref: '',
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
          <h3 className="card-title">👥 {t('people.title')}</h3>
          <p className="card-subtitle">Distinct identity tracking & legal representation relationships</p>
        </div>
        <button
          className="btn-secondary-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? t('common.cancel') : `+ ${t('people.addParticipant')}`}
        </button>
      </div>

      {error && <div className="inline-error">⚠️ {error}</div>}

      {/* Add Person Inline Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="inline-form-box">
          <div className="form-grid-3">
            <div>
              <label className="form-label">{t('intake.applicantName')} *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Faruk Hossain"
              />
            </div>
            <div>
              <label className="form-label">{t('intake.applicantNameBn')}</label>
              <input
                type="text"
                className="form-input"
                value={formData.full_name_bn}
                onChange={(e) => setFormData({ ...formData, full_name_bn: e.target.value })}
                placeholder="e.g. ফারুক হোসেন"
              />
            </div>
            <div>
              <label className="form-label">Role in Case *</label>
              <select
                className="form-input"
                value={formData.role_in_case}
                onChange={(e) => setFormData({ ...formData, role_in_case: e.target.value })}
              >
                <option value="OPPOSING_PARTY">Opposing Party / Respondent</option>
                <option value="AUTHORIZED_REPRESENTATIVE">Authorized Representative</option>
                <option value="WITNESS">Witness</option>
                <option value="PANEL_LAWYER">Panel Lawyer</option>
                <option value="MEDIATOR">Mediator</option>
              </select>
            </div>
          </div>

          <div className="form-grid-3" style={{ marginTop: '10px' }}>
            <div>
              <label className="form-label">{t('people.phone')}</label>
              <input
                type="text"
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="017XXXXXXXX"
              />
            </div>
            <div>
              <label className="form-label">Relationship to Applicant</label>
              <input
                type="text"
                className="form-input"
                value={formData.relationship_to_applicant}
                onChange={(e) => setFormData({ ...formData, relationship_to_applicant: e.target.value })}
                placeholder="e.g. BROTHER, SPOUSE, EMPLOYER"
              />
            </div>
            {formData.role_in_case === 'AUTHORIZED_REPRESENTATIVE' && (
              <div>
                <label className="form-label">{t('people.authDoc')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.authorization_doc_ref}
                  onChange={(e) => setFormData({ ...formData, authorization_doc_ref: e.target.value })}
                  placeholder="e.g. DLAO-REP-AUTH-2026-DH-091"
                />
              </div>
            )}
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

      {/* People List */}
      <div className="people-list">
        {people.length === 0 ? (
          <p className="empty-hint">{t('common.none')}</p>
        ) : (
          people.map((p) => {
            const roleStyle = ROLE_BADGE_STYLE[p.role_in_case] || {
              bg: '#F1F5F9',
              text: '#334155',
              labelEn: p.role_in_case,
              labelBn: p.role_in_case
            };
            const displayName = language === 'bn' && p.full_name_bn ? p.full_name_bn : p.full_name;

            return (
              <div key={p.id || `${p.case_id}-${p.person_id}`} className="person-row">
                <div className="person-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="person-name">{displayName}</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: roleStyle.bg,
                        color: roleStyle.text
                      }}
                    >
                      {language === 'bn' ? roleStyle.labelBn : roleStyle.labelEn}
                    </span>
                    {p.is_primary_contact === 1 && (
                      <span className="badge-primary-contact">
                        ★ {t('people.primaryContact')}
                      </span>
                    )}
                    {p.socio_economic_profile?.accessibility && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: '#EEF2FF',
                        color: '#4338CA',
                        border: '1px solid #C7D2FE'
                      }}>
                        ♿ {t('accessibility.badge')}
                      </span>
                    )}
                  </div>

                  <div className="person-details">
                    {p.relationship_to_applicant && p.relationship_to_applicant !== 'SELF' && (
                      <span>
                        <strong>Relation:</strong> {p.relationship_to_applicant}
                      </span>
                    )}
                    {p.authorization_doc_ref && (
                      <span className="auth-doc-tag">
                        📄 <strong>{t('people.authDoc')}:</strong> {p.authorization_doc_ref}
                      </span>
                    )}
                    {p.phone && <span>📞 {p.phone}</span>}
                    {p.district && <span>📍 {p.district}</span>}
                  </div>

                  {p.notes && <p className="person-notes">{p.notes}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
