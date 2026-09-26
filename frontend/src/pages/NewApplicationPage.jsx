import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

export default function NewApplicationPage({ onCaseCreated, onCancel }) {
  const { language, t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Applicant State
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

  // Representative State (Ripon Pattern)
  const [hasRepresentative, setHasRepresentative] = useState(false);
  const [isAccessibleMode, setIsAccessibleMode] = useState(false);
  const [representative, setRepresentative] = useState({
    full_name: '',
    full_name_bn: '',
    national_id: '',
    phone: '',
    relationship: 'BROTHER',
    auth_doc_ref: ''
  });

  // Safe Contact Mode State (Moyuri Pattern)
  const [isSafeContactActive, setIsSafeContactActive] = useState(false);
  const [safeContactData, setSafeContactData] = useState({
    preferred_contact_method: 'IN_PERSON_REPRESENTATIVE',
    danger_level: 'HIGH',
    unsafe_channels: ['PRIMARY_PHONE', 'DIRECT_SMS'],
    safe_channel_details: '',
    restriction_reason: ''
  });

  // Application & Provenance State
  const [application, setApplication] = useState({
    category: 'FAMILY_DISPUTE',
    intake_channel: 'DLAO_WALKIN',
    intake_office: 'DLAO Dhaka',
    summary: '',
    summary_bn: '',
    provenance_source: 'spoken_by_person'
  });

  const handleToggleUnsafeChannel = (ch) => {
    setSafeContactData((prev) => {
      const exists = prev.unsafe_channels.includes(ch);
      return {
        ...prev,
        unsafe_channels: exists
          ? prev.unsafe_channels.filter((c) => c !== ch)
          : [...prev.unsafe_channels, ch]
      };
    });
  };

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
            vulnerability: applicant.vulnerability,
            safe_contact_required: isSafeContactActive
          }
        },
        category: application.category,
        intake_channel: isAccessibleMode ? 'VOICE_FIRST_INTAKE' : application.intake_channel,
        intake_office: application.intake_office,
        summary: application.summary,
        summary_bn: application.summary_bn || null,
        provenance: {
          field_name: 'intake_grievance_narrative',
          source_type: application.provenance_source,
          source_language: 'bn',
          target_language: 'bn',
          raw_content: application.summary,
          processed_content: application.summary,
          is_secondhand_report: hasRepresentative ? 1 : 0,
          source_details: {
            intake_channel: application.intake_channel,
            voice_first_mode: isAccessibleMode,
            reporter: hasRepresentative ? representative.full_name : applicant.full_name
          }
        }
      };

      if (hasRepresentative && representative.full_name) {
        payload.representative = {
          full_name: representative.full_name,
          full_name_bn: representative.full_name_bn || null,
          national_id: representative.national_id || null,
          phone: representative.phone || null,
          district: applicant.district,
          division: applicant.division,
          socio_economic_profile: {
            relationship_to_applicant: representative.relationship,
            accessibility: isAccessibleMode
              ? {
                  visual_impairment: true,
                  interaction_mode: 'NON_VISUAL_VOICE_FIRST',
                  no_captcha_required: true,
                  no_visual_otp_required: true
                }
              : null
          }
        };
      }

      // 1. Create Application in SQLite Backend
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
        authorization_doc_ref: representative.auth_doc_ref,
        safe_contact: isSafeContactActive ? safeContactData : null
      });

      setSuccessInfo({
        applicationId: createdApp.id,
        caseId: caseRes.data.id,
        caseNumber: caseRes.data.case_number
      });

      // Switch to newly created case dossier after brief notice
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
          <p className="page-subtitle">
            {language === 'bn'
              ? 'আইনগত সহায়তা আবেদন গ্রহণ — সম্পূর্ণ প্রমাণ লগ ও নিরাপত্তা সুরক্ষা সহ'
              : 'Register Citizen Application with Provenance & Safe-Contact Integrity'}
          </p>
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
                placeholder="e.g. Moyuri Akter"
              />
            </div>
            <div>
              <label className="form-label">{t('intake.applicantNameBn')}</label>
              <input
                type="text"
                className="form-input"
                value={applicant.full_name_bn}
                onChange={(e) => setApplicant({ ...applicant, full_name_bn: e.target.value })}
                placeholder="যেমন: ময়ূরী আক্তার"
              />
            </div>
            <div>
              <label className="form-label">{t('intake.nid')}</label>
              <input
                type="text"
                className="form-input"
                value={applicant.national_id}
                onChange={(e) => setApplicant({ ...applicant, national_id: e.target.value })}
                placeholder="NID / BRN (Optional if confiscated)"
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

        {/* Section 2: Authorized Representative & Secondhand Reporting (Ripon Pattern) */}
        <div className="form-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h3 className="section-title">2. Legal Representation & Secondhand Reporting (প্রতিনিধিত্ব ও দ্বিতীয়পক্ষীয় আবেদন)</h3>
            <label className="checkbox-label" style={{ background: '#F1F5F9', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasRepresentative}
                onChange={(e) => setHasRepresentative(e.target.checked)}
              />
              <strong>{t('intake.hasRepresentative')}</strong>
            </label>
          </div>

          {hasRepresentative && (
            <div className="representative-subform" style={{ marginTop: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#475569' }}>
                ℹ️ <strong>Secondhand Reporting Provenance:</strong> Ripon / representative identity is kept distinct and verified via authorization documentation. Provenance will register this as secondhand oral report on behalf of the applicant.
              </p>

              {/* Accessibility Mode Toggle for Blind/Voice-first Pathway */}
              <div style={{ padding: '10px 14px', background: '#EEF2FF', borderRadius: '6px', border: '1px solid #C7D2FE', marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#3730A3', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={isAccessibleMode}
                    onChange={(e) => setIsAccessibleMode(e.target.checked)}
                  />
                  <span>{t('accessibility.voiceFirstTitle')}</span>
                </label>
                <p style={{ margin: '4px 0 0 24px', fontSize: '12px', color: '#4338CA' }}>
                  {t('accessibility.voiceFirstDesc')}
                </p>
              </div>

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
                    placeholder="e.g. DLAO-REP-AUTH-2026-DH-091"
                  />
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: '12px' }}>
                <div>
                  <label className="form-label">Representative Phone (প্রতিনিধির ফোন)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={representative.phone}
                    onChange={(e) => setRepresentative({ ...representative, phone: e.target.value })}
                    placeholder="01822000102"
                  />
                </div>
                <div>
                  <label className="form-label">Representative NID (প্রতিনিধির এনআইডি)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={representative.national_id}
                    onChange={(e) => setRepresentative({ ...representative, national_id: e.target.value })}
                    placeholder="NID-199656100102"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Safe Contact Protocol Mode (Flow 1: Moyuri Pattern) */}
        <div className="form-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h3 className="section-title">3. Safe Contact Protection Protocol (সুরক্ষিত যোগাযোগ প্রটোকল)</h3>
            <label className="checkbox-label" style={{ background: '#FEF2F2', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #FECACA' }}>
              <input
                type="checkbox"
                checked={isSafeContactActive}
                onChange={(e) => setIsSafeContactActive(e.target.checked)}
              />
              <strong style={{ color: '#991B1B' }}>🛡️ {t('safeContact.enableMode')}</strong>
            </label>
          </div>

          {isSafeContactActive && (
            <div style={{ marginTop: '12px', padding: '16px', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#92400E' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <strong>{t('safeContact.activeAlert')}</strong>
              </div>

              <div className="form-grid-2">
                <div>
                  <label className="form-label">{t('safeContact.preferredMethod')} *</label>
                  <select
                    className="form-input"
                    value={safeContactData.preferred_contact_method}
                    onChange={(e) => setSafeContactData({ ...safeContactData, preferred_contact_method: e.target.value })}
                  >
                    <option value="IN_PERSON_REPRESENTATIVE">In-Person Authorized Representative (অনুমোদিত প্রতিনিধির মাধ্যমে)</option>
                    <option value="ALTERNATIVE_PHONE">Alternative Confidential Phone (বিকল্প গোপনীয় ফোন)</option>
                    <option value="SECURE_OFFICE_VISIT">Scheduled DLAO Office Visit Only (নির্ধারিত অফিস সাক্ষাৎ)</option>
                    <option value="COMMUNITY_PARALEGAL">Confidential Community Paralegal (প্যারা-লিগ্যাল প্রতিনিধি)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">{t('safeContact.dangerLevel')} *</label>
                  <select
                    className="form-input"
                    value={safeContactData.danger_level}
                    onChange={(e) => setSafeContactData({ ...safeContactData, danger_level: e.target.value })}
                  >
                    <option value="HIGH">High Immediate Risk (উচ্চ তাৎক্ষণিক ঝুঁকি)</option>
                    <option value="CRITICAL">Critical Life Safety Risk (চরম জীবনহানি ঝুঁকি)</option>
                    <option value="MEDIUM">Medium Precautionary (সতর্কতামূলক মধ্যম ঝুঁকি)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label className="form-label">{t('safeContact.unsafeChannels')} (Strictly Blocked):</label>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={safeContactData.unsafe_channels.includes('PRIMARY_PHONE')}
                      onChange={() => handleToggleUnsafeChannel('PRIMARY_PHONE')}
                    />
                    Primary Phone (আবেদনকারীর মূল ফোন)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={safeContactData.unsafe_channels.includes('DIRECT_SMS')}
                      onChange={() => handleToggleUnsafeChannel('DIRECT_SMS')}
                    />
                    Direct SMS (সরাসরি এসএমএস)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={safeContactData.unsafe_channels.includes('UNSCHEDULED_HOME_VISIT')}
                      onChange={() => handleToggleUnsafeChannel('UNSCHEDULED_HOME_VISIT')}
                    />
                    Unscheduled Home Visit (না জানিয়ে বাড়ি পরিদর্শন)
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label className="form-label">{t('safeContact.safeDetails')} *</label>
                <textarea
                  required={isSafeContactActive}
                  rows={2}
                  className="form-input"
                  value={safeContactData.safe_channel_details}
                  onChange={(e) => setSafeContactData({ ...safeContactData, safe_channel_details: e.target.value })}
                  placeholder="e.g. Contact ONLY through brother Ripon at 01822000102. NEVER send SMS or place calls to applicant number as perpetrator intercepts all communications."
                />
              </div>

              <div style={{ marginTop: '12px' }}>
                <label className="form-label">{t('safeContact.restrictionReason')} *</label>
                <input
                  type="text"
                  required={isSafeContactActive}
                  className="form-input"
                  value={safeContactData.restriction_reason}
                  onChange={(e) => setSafeContactData({ ...safeContactData, restriction_reason: e.target.value })}
                  placeholder="e.g. Perpetrator husband controls phone, monitors messages, and confiscated NID card."
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Legal Aid Problem & Intake Origin */}
        <div className="form-section">
          <h3 className="section-title">4. Case Classification & Provenance Origin (মামলার ধরন ও তথ্যের উৎস)</h3>
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
