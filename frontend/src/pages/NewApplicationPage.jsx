import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

export default function NewApplicationPage({ onCaseCreated, onCancel }) {
  const { language, t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Form State
  const [applicant, setApplicant] = useState({
    full_name: '',
    full_name_bn: '',
    national_id: '',
    phone: '',
    gender: 'FEMALE',
    district: 'Dhaka',
    division: 'Dhaka',
    income: '8000',
    vulnerability: ''
  });

  const [hasRepresentative, setHasRepresentative] = useState(false);
  const [representative, setRepresentative] = useState({
    full_name: '',
    full_name_bn: '',
    national_id: '',
    phone: '',
    relationship: 'BROTHER',
    auth_doc_ref: ''
  });

  const [application, setApplication] = useState({
    category: 'FAMILY_DISPUTE',
    intake_channel: 'DLAO_WALKIN',
    intake_office: 'DLAO Dhaka',
    summary: '',
    summary_bn: '',
    provenance_source: 'spoken_by_person'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const payload = {
        applicant: {
          full_name: applicant.full_name,
          full_name_bn: applicant.full_name_bn || null,
          national_id: applicant.national_id || null,
          phone: applicant.phone || null,
          gender: applicant.gender,
          district: applicant.district,
          division: applicant.division,
          socio_economic_profile: {
            income: applicant.income,
            vulnerability: applicant.vulnerability
          }
        },
        category: application.category,
        intake_channel: application.intake_channel,
        intake_office: application.intake_office,
        summary: application.summary,
        summary_bn: application.summary_bn || null,
        provenance: {
          field_name: 'intake_narrative',
          source_type: application.provenance_source,
          source_language: 'bn',
          target_language: 'bn',
          raw_content: application.summary,
          processed_content: application.summary,
          source_details: { channel: application.intake_channel }
        }
      };

      if (hasRepresentative && representative.full_name) {
        payload.representative = {
          full_name: representative.full_name,
          full_name_bn: representative.full_name_bn || null,
          national_id: representative.national_id || null,
          phone: representative.phone || null,
          district: applicant.district,
          division: applicant.division
        };
      }

      // 1. Create Application via Backend API
      const appRes = await api.createApplication(payload);
      const createdApp = appRes.data;

      // 2. Automatically create initial Case linked to this Application ID
      const caseRes = await api.createCase({
        application_id: createdApp.id,
        title: application.summary,
        title_bn: application.summary_bn,
        category: application.category,
        intake_office: application.intake_office,
        representative_relationship: representative.relationship,
        authorization_doc_ref: representative.auth_doc_ref
      });

      setSuccessInfo({
        applicationId: createdApp.id,
        caseId: caseRes.data.id,
        caseNumber: caseRes.data.case_number
      });

      // Switch to newly created case after short delay
      setTimeout(() => {
        if (onCaseCreated) {
          onCaseCreated(caseRes.data.id);
        }
      }, 1500);

    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2 className="page-title">{t('intake.title')}</h2>
          <p className="page-subtitle">{t('intake.subtitle')}</p>
        </div>
        <button className="btn-secondary" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {successInfo && (
        <div className="success-banner">
          🎉 <strong>{t('intake.success')}</strong> {successInfo.applicationId}
          <br />
          Generated Case: <strong>{successInfo.caseNumber}</strong> ({successInfo.caseId}). Navigating to dossier...
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card">
        {/* Section 1: Citizen Applicant Information */}
        <div className="form-section">
          <h3 className="section-title">1. Citizen Applicant Identity (নাগরিক আবেদনকারীর পরিচয়)</h3>
          <div className="form-grid-3">
            <div>
              <label className="form-label">{t('intake.applicantName')} *</label>
              <input
                type="text"
                required
                className="form-input"
                value={applicant.full_name}
                onChange={(e) => setApplicant({ ...applicant, full_name: e.target.value })}
                placeholder="e.g. Parvin Begum"
              />
            </div>
            <div>
              <label className="form-label">{t('intake.applicantNameBn')}</label>
              <input
                type="text"
                className="form-input"
                value={applicant.full_name_bn}
                onChange={(e) => setApplicant({ ...applicant, full_name_bn: e.target.value })}
                placeholder="e.g. পারভীন বেগম"
              />
            </div>
            <div>
              <label className="form-label">{t('intake.nid')}</label>
              <input
                type="text"
                className="form-input"
                value={applicant.national_id}
                onChange={(e) => setApplicant({ ...applicant, national_id: e.target.value })}
                placeholder="NID / BRN number"
              />
            </div>
          </div>

          <div className="form-grid-3" style={{ marginTop: '12px' }}>
            <div>
              <label className="form-label">{t('intake.phone')}</label>
              <input
                type="text"
                className="form-input"
                value={applicant.phone}
                onChange={(e) => setApplicant({ ...applicant, phone: e.target.value })}
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div>
              <label className="form-label">{t('intake.district')} *</label>
              <input
                type="text"
                required
                className="form-input"
                value={applicant.district}
                onChange={(e) => setApplicant({ ...applicant, district: e.target.value })}
                placeholder="e.g. Dhaka, Rangamati, Sylhet"
              />
            </div>
            <div>
              <label className="form-label">{t('intake.division')} *</label>
              <input
                type="text"
                required
                className="form-input"
                value={applicant.division}
                onChange={(e) => setApplicant({ ...applicant, division: e.target.value })}
                placeholder="e.g. Dhaka, Chattogram, Sylhet"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Authorized Representative (Moyuri & Ripon Pattern) */}
        <div className="form-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="section-title">2. Legal Representation (অনুমোদিত প্রতিনিধি)</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasRepresentative}
                onChange={(e) => setHasRepresentative(e.target.checked)}
              />
              <strong>{t('intake.hasRepresentative')}</strong>
            </label>
          </div>

          {hasRepresentative && (
            <div className="representative-subform">
              <p className="hint-text">
                ⚠️ Explicit representation mode (Moyuri & Ripon pattern): Representative identity is kept distinct and linked via authorization documentation.
              </p>
              <div className="form-grid-3">
                <div>
                  <label className="form-label">{t('intake.repName')} *</label>
                  <input
                    type="text"
                    required={hasRepresentative}
                    className="form-input"
                    value={representative.full_name}
                    onChange={(e) => setRepresentative({ ...representative, full_name: e.target.value })}
                    placeholder="e.g. Ripon"
                  />
                </div>
                <div>
                  <label className="form-label">{t('intake.repRelation')} *</label>
                  <input
                    type="text"
                    required={hasRepresentative}
                    className="form-input"
                    value={representative.relationship}
                    onChange={(e) => setRepresentative({ ...representative, relationship: e.target.value })}
                    placeholder="e.g. BROTHER, SISTER, UNCLE"
                  />
                </div>
                <div>
                  <label className="form-label">{t('intake.repAuthDoc')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={representative.auth_doc_ref}
                    onChange={(e) => setRepresentative({ ...representative, auth_doc_ref: e.target.value })}
                    placeholder="e.g. DLAO-REP-AUTH-2026-DH-099"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Legal Aid Problem & Intake Origin */}
        <div className="form-section">
          <h3 className="section-title">3. Case Classification & Provenance Origin</h3>
          <div className="form-grid-3">
            <div>
              <label className="form-label">{t('intake.category')} *</label>
              <select
                className="form-input"
                value={application.category}
                onChange={(e) => setApplication({ ...application, category: e.target.value })}
              >
                <option value="FAMILY_DISPUTE">Family Dispute / Maintenance / Dower</option>
                <option value="LAND_PROPERTY">Land & Property Dispute</option>
                <option value="GENDER_VIOLENCE">Gender-Based Violence / Protection</option>
                <option value="LABOUR_DISPUTE">Labour Rights / Wage Recovery</option>
                <option value="INDIGENOUS_RIGHTS">Indigenous Rights & Customary Land</option>
                <option value="CRIMINAL_DEFENSE">Criminal Defense Assistance</option>
                <option value="CIVIL_GENERAL">General Civil Matter</option>
              </select>
            </div>
            <div>
              <label className="form-label">{t('intake.intakeChannel')} *</label>
              <select
                className="form-input"
                value={application.intake_channel}
                onChange={(e) => setApplication({ ...application, intake_channel: e.target.value })}
              >
                <option value="DLAO_WALKIN">DLAO Office In-Person Walk-in</option>
                <option value="HELPLINE_16699">National Helpline 16699</option>
                <option value="UDC_PORTAL">Union Digital Centre (UDC)</option>
                <option value="ONLINE_CITIZEN">Direct Citizen Web Portal</option>
              </select>
            </div>
            <div>
              <label className="form-label">Initial Provenance Attribution *</label>
              <select
                className="form-input"
                value={application.provenance_source}
                onChange={(e) => setApplication({ ...application, provenance_source: e.target.value })}
              >
                <option value="spoken_by_person">Spoken by Person (Oral Statement)</option>
                <option value="typed_by_staff">Typed by Staff (Assisted Intake)</option>
                <option value="typed_by_person">Typed by Citizen</option>
                <option value="translated">Translated (Indigenous/Regional dialect)</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '12px' }}>
            <div>
              <label className="form-label">{t('intake.summary')} (EN) *</label>
              <textarea
                required
                rows="3"
                className="form-input"
                value={application.summary}
                onChange={(e) => setApplication({ ...application, summary: e.target.value })}
                placeholder="Describe the legal grievances, opposing parties, and relief sought..."
              />
            </div>
            <div>
              <label className="form-label">{t('intake.summary')} (BN)</label>
              <textarea
                rows="3"
                className="form-input"
                value={application.summary_bn}
                onChange={(e) => setApplication({ ...application, summary_bn: e.target.value })}
                placeholder="আইনি সমস্যা ও প্রার্থীত প্রতিকার সংক্ষেপে বর্ণনা করুন..."
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('intake.submitting') : `🚀 ${t('intake.submit')}`}
          </button>
        </div>
      </form>
    </div>
  );
}
