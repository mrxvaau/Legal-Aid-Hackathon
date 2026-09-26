import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

export default function CitizenIntakePage({ onCaseCreated, onCancel }) {
  const { language, t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successReceipt, setSuccessReceipt] = useState(null);

  // Form State
  const [isRepresentative, setIsRepresentative] = useState(false);
  const [isVoiceFirstMode, setIsVoiceFirstMode] = useState(false);
  const [isSafeContactNeeded, setIsSafeContactNeeded] = useState(false);

  const [applicant, setApplicant] = useState({
    full_name: '',
    full_name_bn: '',
    phone: '',
    district: 'Dhaka',
    division: 'Dhaka'
  });

  const [representative, setRepresentative] = useState({
    full_name: '',
    phone: '',
    relationship: 'BROTHER',
    auth_doc_ref: ''
  });

  const [safeContact, setSafeContact] = useState({
    preferred_contact_method: 'IN_PERSON_REPRESENTATIVE',
    safe_channel_details: '',
    restriction_reason: '',
    danger_level: 'HIGH',
    unsafe_channels: ['PRIMARY_PHONE', 'DIRECT_SMS']
  });

  const [caseDetails, setCaseDetails] = useState({
    category: 'FAMILY_DISPUTE',
    summary: '',
    summary_bn: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessReceipt(null);

    try {
      // 1. Submit Application to Backend
      const appPayload = {
        applicant: {
          full_name: applicant.full_name,
          full_name_bn: applicant.full_name_bn || null,
          phone: applicant.phone || null,
          district: applicant.district,
          division: applicant.division,
          gender: 'FEMALE',
          socio_economic_profile: {
            intake_pathway: isVoiceFirstMode ? 'VOICE_FIRST_ACCESSIBLE' : 'WEB_CITIZEN',
            safe_contact_active: isSafeContactNeeded
          }
        },
        category: caseDetails.category,
        intake_channel: isVoiceFirstMode ? 'VOICE_FIRST_INTAKE' : 'ONLINE_CITIZEN',
        intake_office: `DLAO ${applicant.district}`,
        summary: caseDetails.summary,
        summary_bn: caseDetails.summary_bn || null,
        provenance: {
          field_name: 'citizen_intake_statement',
          source_type: isRepresentative ? 'spoken_by_person' : 'typed_by_person',
          source_language: 'bn',
          target_language: 'bn',
          raw_content: caseDetails.summary,
          processed_content: caseDetails.summary,
          is_secondhand_report: isRepresentative ? 1 : 0,
          source_details: {
            portal: 'CITIZEN_EXPERIENCE',
            voice_first_mode: isVoiceFirstMode,
            submitted_by: isRepresentative ? representative.full_name : applicant.full_name
          }
        }
      };

      if (isRepresentative && representative.full_name) {
        appPayload.representative = {
          full_name: representative.full_name,
          phone: representative.phone || null,
          district: applicant.district,
          division: applicant.division,
          socio_economic_profile: {
            relationship_to_applicant: representative.relationship,
            accessibility: isVoiceFirstMode
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

      const appRes = await api.createApplication(appPayload);
      const createdApp = appRes.data;

      // 2. Automatically convert to Case
      const caseRes = await api.createCase({
        application_id: createdApp.id,
        title: caseDetails.summary,
        title_bn: caseDetails.summary_bn,
        category: caseDetails.category,
        intake_office: `DLAO ${applicant.district}`,
        representative_relationship: isRepresentative ? representative.relationship : null,
        authorization_doc_ref: isRepresentative ? representative.auth_doc_ref : null,
        safe_contact: isSafeContactNeeded ? safeContact : null
      });

      setSuccessReceipt({
        applicationId: createdApp.id,
        caseId: caseRes.data.id,
        caseNumber: caseRes.data.case_number,
        applicantName: applicant.full_name,
        intakeOffice: `DLAO ${applicant.district}`,
        createdAt: new Date().toLocaleString()
      });

    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="citizen-portal-container" role="main" aria-label="Citizen Legal Aid Intake">
      {/* Header */}
      <div className="citizen-hero-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }} aria-hidden="true">📝</span>
          <div>
            <h2 className="citizen-hero-title">
              {language === 'bn' ? 'বিনামূল্যে আইনি সহায়তা আবেদন (নাগরিক ফর্ম)' : 'Free Digital Legal Aid Application'}
            </h2>
            <p className="citizen-hero-subtitle">
              {language === 'bn'
                ? 'সহজ ও নিরাপদ আবেদন প্রক্রিয়া • কোনো ভিজ্যুয়াল ক্যাপচা নেই • কিবোর্ড ও ভয়েস-বান্ধব'
                : 'Accessible citizen intake • Zero visual CAPTCHA • Screen-reader & voice-first compatible'}
            </p>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          ← {t('common.cancel')}
        </button>
      </div>

      {error && (
        <div className="citizen-alert-box error" role="alert">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* Success Receipt */}
      {successReceipt && (
        <div className="citizen-status-card" style={{ borderColor: '#22C55E', background: '#F0FDF4' }} role="region" aria-label="Application Receipt">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '36px' }}>🎉</span>
            <div>
              <h3 style={{ margin: 0, color: '#166534', fontSize: '18px', fontWeight: '800' }}>
                {language === 'bn' ? 'আবেদন সফলভাবে গৃহীত হয়েছে!' : 'Application Successfully Registered!'}
              </h3>
              <p style={{ margin: '4px 0 0 0', color: '#14532D', fontSize: '13px' }}>
                {language === 'bn' ? 'আপনার আবেদন ও মামলার ট্র্যাকিং তথ্য নিচে সংরক্ষিত রয়েছে:' : 'Your application has been converted to an active legal aid proceeding:'}
              </p>
            </div>
          </div>

          <div className="citizen-facts-grid" style={{ marginTop: '16px' }}>
            <div className="citizen-fact-cell" style={{ background: '#FFFFFF' }}>
              <span className="fact-label">Application Trace ID:</span>
              <span className="fact-value highlight" style={{ color: '#15803D' }}>{successReceipt.applicationId}</span>
            </div>
            <div className="citizen-fact-cell" style={{ background: '#FFFFFF' }}>
              <span className="fact-label">Official Case Number:</span>
              <span className="fact-value highlight" style={{ color: '#15803D' }}>{successReceipt.caseNumber}</span>
            </div>
            <div className="citizen-fact-cell" style={{ background: '#FFFFFF' }}>
              <span className="fact-label">Applicant:</span>
              <span className="fact-value">{successReceipt.applicantName}</span>
            </div>
            <div className="citizen-fact-cell" style={{ background: '#FFFFFF' }}>
              <span className="fact-label">Assigned Office:</span>
              <span className="fact-value">{successReceipt.intakeOffice}</span>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-citizen-primary"
              onClick={() => onCaseCreated(successReceipt.caseId)}
            >
              🔍 {language === 'bn' ? 'মামলার স্ট্যাটাস দেখুন' : 'View Case Status Dossier'}
            </button>
          </div>
        </div>
      )}

      {/* Main Intake Form */}
      {!successReceipt && (
        <form onSubmit={handleSubmit} className="citizen-form-box">
          {/* Step 1: Who is applying? */}
          <fieldset className="citizen-fieldset">
            <legend className="citizen-legend">
              1. {language === 'bn' ? 'আবেদনকারীর বিবরণ' : 'Applicant Details'}
            </legend>

            <div style={{ marginBottom: '14px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                <input
                  type="radio"
                  name="intake-type"
                  checked={!isRepresentative}
                  onChange={() => setIsRepresentative(false)}
                />
                {language === 'bn' ? 'আমি নিজের জন্য আবেদন করছি' : 'I am applying for myself'}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                <input
                  type="radio"
                  name="intake-type"
                  checked={isRepresentative}
                  onChange={() => setIsRepresentative(true)}
                />
                {language === 'bn' ? 'আমি অনুমোদিত প্রতিনিধি হিসেবে আবেদন করছি' : 'I am an Authorized Representative applying for someone else'}
              </label>
            </div>

            <div className="form-grid-2">
              <div>
                <label htmlFor="cit-app-name" className="citizen-label">
                  {language === 'bn' ? 'আবেদনকারীর নাম (ইংরেজি) *' : 'Applicant Full Name (English) *'}
                </label>
                <input
                  id="cit-app-name"
                  type="text"
                  required
                  className="citizen-input"
                  value={applicant.full_name}
                  onChange={(e) => setApplicant({ ...applicant, full_name: e.target.value })}
                  placeholder="e.g. Moyuri Akter"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="cit-app-name-bn" className="citizen-label">
                  {language === 'bn' ? 'আবেদনকারীর নাম (বাংলায়)' : 'Applicant Name (Bangla)'}
                </label>
                <input
                  id="cit-app-name-bn"
                  type="text"
                  className="citizen-input"
                  value={applicant.full_name_bn}
                  onChange={(e) => setApplicant({ ...applicant, full_name_bn: e.target.value })}
                  placeholder="যেমন: ময়ূরী আক্তার"
                />
              </div>
            </div>

            <div className="form-grid-3" style={{ marginTop: '12px' }}>
              <div>
                <label htmlFor="cit-app-phone" className="citizen-label">
                  {language === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
                </label>
                <input
                  id="cit-app-phone"
                  type="text"
                  className="citizen-input"
                  value={applicant.phone}
                  onChange={(e) => setApplicant({ ...applicant, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                />
              </div>

              <div>
                <label htmlFor="cit-app-dist" className="citizen-label">
                  {language === 'bn' ? 'জেলা *' : 'District *'}
                </label>
                <input
                  id="cit-app-dist"
                  type="text"
                  required
                  className="citizen-input"
                  value={applicant.district}
                  onChange={(e) => setApplicant({ ...applicant, district: e.target.value })}
                  placeholder="e.g. Dhaka"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="cit-app-div" className="citizen-label">
                  {language === 'bn' ? 'বিভাগ *' : 'Division *'}
                </label>
                <input
                  id="cit-app-div"
                  type="text"
                  required
                  className="citizen-input"
                  value={applicant.division}
                  onChange={(e) => setApplicant({ ...applicant, division: e.target.value })}
                  placeholder="e.g. Dhaka"
                  aria-required="true"
                />
              </div>
            </div>
          </fieldset>

          {/* Representative Details (if selected) */}
          {isRepresentative && (
            <fieldset className="citizen-fieldset" style={{ background: '#F8FAFC', borderColor: '#CBD5E1' }}>
              <legend className="citizen-legend">
                2. {language === 'bn' ? 'অনুমোদিত প্রতিনিধির বিবরণ (রিপন প্যাটার্ন)' : 'Authorized Representative Information'}
              </legend>

              {/* Voice-First Accessibility Toggle */}
              <div style={{ padding: '10px 14px', background: '#EEF2FF', borderRadius: '6px', border: '1px solid #C7D2FE', marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#3730A3', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={isVoiceFirstMode}
                    onChange={(e) => setIsVoiceFirstMode(e.target.checked)}
                  />
                  <span>{t('accessibility.voiceFirstTitle')}</span>
                </label>
                <p style={{ margin: '4px 0 0 24px', fontSize: '12px', color: '#4338CA' }}>
                  {t('accessibility.voiceFirstDesc')}
                </p>
              </div>

              <div className="form-grid-3">
                <div>
                  <label htmlFor="cit-rep-name" className="citizen-label">
                    {language === 'bn' ? 'প্রতিনিধির নাম *' : 'Representative Name *'}
                  </label>
                  <input
                    id="cit-rep-name"
                    type="text"
                    required={isRepresentative}
                    className="citizen-input"
                    value={representative.full_name}
                    onChange={(e) => setRepresentative({ ...representative, full_name: e.target.value })}
                    placeholder="e.g. Ripon"
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="cit-rep-rel" className="citizen-label">
                    {language === 'bn' ? 'আবেদনকারীর সাথে সম্পর্ক *' : 'Relationship to Applicant *'}
                  </label>
                  <input
                    id="cit-rep-rel"
                    type="text"
                    required={isRepresentative}
                    className="citizen-input"
                    value={representative.relationship}
                    onChange={(e) => setRepresentative({ ...representative, relationship: e.target.value })}
                    placeholder="e.g. BROTHER, UNCLE, GUARDIAN"
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="cit-rep-doc" className="citizen-label">
                    {language === 'bn' ? 'অনুমোদন সনদ রেফারেন্স' : 'Authorization Doc Ref'}
                  </label>
                  <input
                    id="cit-rep-doc"
                    type="text"
                    className="citizen-input"
                    value={representative.auth_doc_ref}
                    onChange={(e) => setRepresentative({ ...representative, auth_doc_ref: e.target.value })}
                    placeholder="e.g. DLAO-REP-AUTH-2026-DH-091"
                  />
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label htmlFor="cit-rep-phone" className="citizen-label">
                  {language === 'bn' ? 'প্রতিনিধির ফোন নম্বর' : 'Representative Phone Number'}
                </label>
                <input
                  id="cit-rep-phone"
                  type="text"
                  className="citizen-input"
                  value={representative.phone}
                  onChange={(e) => setRepresentative({ ...representative, phone: e.target.value })}
                  placeholder="018XXXXXXXX"
                />
              </div>
            </fieldset>
          )}

          {/* Contact Safety Protection Mode (Moyuri Pattern) */}
          <fieldset className="citizen-fieldset" style={{ background: '#FFFDF5', borderColor: '#FDE68A' }}>
            <legend className="citizen-legend" style={{ color: '#92400E' }}>
              3. {language === 'bn' ? 'যোগাযোগ নিরাপত্তা সুরক্ষা (ময়ূরী প্যাটার্ন)' : 'Contact Safety Protection Protocol'}
            </legend>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#991B1B' }}>
              <input
                type="checkbox"
                checked={isSafeContactNeeded}
                onChange={(e) => setIsSafeContactNeeded(e.target.checked)}
              />
              <span>🛡️ {t('safeContact.enableMode')}</span>
            </label>

            {isSafeContactNeeded && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label htmlFor="cit-safe-method" className="citizen-label">
                    {t('safeContact.preferredMethod')}:
                  </label>
                  <select
                    id="cit-safe-method"
                    className="citizen-input"
                    value={safeContact.preferred_contact_method}
                    onChange={(e) => setSafeContact({ ...safeContact, preferred_contact_method: e.target.value })}
                  >
                    <option value="IN_PERSON_REPRESENTATIVE">In-Person Authorized Representative (অনুমোদিত প্রতিনিধি)</option>
                    <option value="ALTERNATIVE_PHONE">Alternative Confidential Phone (বিকল্প গোপনীয় ফোন)</option>
                    <option value="SECURE_OFFICE_VISIT">Scheduled DLAO Office Visit Only (নির্ধারিত অফিস সাক্ষাৎ)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label htmlFor="cit-safe-details" className="citizen-label">
                    {t('safeContact.safeDetails')} *
                  </label>
                  <textarea
                    id="cit-safe-details"
                    required={isSafeContactNeeded}
                    rows={2}
                    className="citizen-input"
                    value={safeContact.safe_channel_details}
                    onChange={(e) => setSafeContact({ ...safeContact, safe_channel_details: e.target.value })}
                    placeholder="e.g. Call brother Ripon at 01822000102. NEVER call applicant phone."
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="cit-safe-reason" className="citizen-label">
                    {t('safeContact.restrictionReason')} *
                  </label>
                  <input
                    id="cit-safe-reason"
                    type="text"
                    required={isSafeContactNeeded}
                    className="citizen-input"
                    value={safeContact.restriction_reason}
                    onChange={(e) => setSafeContact({ ...safeContact, restriction_reason: e.target.value })}
                    placeholder="e.g. Perpetrator controls phone, intercepts messages, and confiscated NID."
                    aria-required="true"
                  />
                </div>
              </div>
            )}
          </fieldset>

          {/* Legal Problem Statement */}
          <fieldset className="citizen-fieldset">
            <legend className="citizen-legend">
              4. {language === 'bn' ? 'আইনি সমস্যার বিবরণ' : 'Legal Problem Description'}
            </legend>

            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="cit-case-cat" className="citizen-label">
                {t('intake.category')} *
              </label>
              <select
                id="cit-case-cat"
                className="citizen-input"
                value={caseDetails.category}
                onChange={(e) => setCaseDetails({ ...caseDetails, category: e.target.value })}
              >
                <option value="FAMILY_DISPUTE">Family Dispute / Maintenance / Dower (পারিবারিক বিরোধ / খোরপোশ)</option>
                <option value="GENDER_VIOLENCE">Gender-Based Violence / Protection (নারী ও শিশু নির্যাতন / সুরক্ষা)</option>
                <option value="LAND_PROPERTY">Land & Property Dispute (জমিজমা সংক্রান্ত বিরোধ)</option>
                <option value="LABOUR_DISPUTE">Labour Rights / Wage Theft (শ্রম অধিকার / বকেয়া বেতন)</option>
                <option value="INDIGENOUS_RIGHTS">Indigenous Rights & Customary Land (ক্ষুদ্র নৃগোষ্ঠীর অধিকার)</option>
              </select>
            </div>

            <div className="form-grid-2">
              <div>
                <label htmlFor="cit-case-summary" className="citizen-label">
                  {t('intake.summary')} (English) *
                </label>
                <textarea
                  id="cit-case-summary"
                  required
                  rows={3}
                  className="citizen-input"
                  value={caseDetails.summary}
                  onChange={(e) => setCaseDetails({ ...caseDetails, summary: e.target.value })}
                  placeholder="Describe your legal problem, parties involved, and what help you need..."
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="cit-case-summary-bn" className="citizen-label">
                  {t('intake.summary')} (বাংলায়)
                </label>
                <textarea
                  id="cit-case-summary-bn"
                  rows={3}
                  className="citizen-input"
                  value={caseDetails.summary_bn}
                  onChange={(e) => setCaseDetails({ ...caseDetails, summary_bn: e.target.value })}
                  placeholder="আপনার আইনি সমস্যার বিবরণ এবং কী ধরনের সহায়তা প্রয়োজন লিখুন..."
                />
              </div>
            </div>
          </fieldset>

          {/* Accessible Submit Action */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" onClick={onCancel}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-citizen-primary"
              disabled={submitting}
              aria-label={submitting ? t('intake.submitting') : t('intake.submit')}
            >
              {submitting ? t('intake.submitting') : `🚀 ${language === 'bn' ? 'আবেদন দাখিল করুন' : 'Submit Free Application'}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
