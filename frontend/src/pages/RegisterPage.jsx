import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';
import { IconCitizen, IconOfficer, IconLawyer, IconArrowLeft, IconCheckCircle, IconAlertTriangle } from '../components/Icons';

export default function RegisterPage({ initialRole = 'citizen', onNavigateLogin, onBackToLanding }) {
  const { language } = useLanguage();
  const [roleType, setRoleType] = useState(initialRole); // 'citizen' | 'officer' | 'lawyer'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Common divisions list
  const divisions = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'];

  // Form states
  // 1. Citizen State
  const [citizenForm, setCitizenForm] = useState({
    fullName: '',
    fullNameBn: '',
    phone: '',
    nationalId: '',
    division: 'Dhaka',
    district: 'Dhaka',
    isRepresentative: false,
    representedPerson: ''
  });

  // 2. Service Officer State
  const [officerForm, setOfficerForm] = useState({
    fullName: '',
    fullNameBn: '',
    staffId: '',
    phone: '',
    district: 'Dhaka',
    division: 'Dhaka',
    office: 'DLAO Dhaka',
    subRole: 'B1_DLAO_OFFICER'
  });

  // 3. Panel Lawyer State
  const [lawyerForm, setLawyerForm] = useState({
    fullName: '',
    fullNameBn: '',
    barId: '',
    phone: '',
    district: 'Dhaka',
    division: 'Dhaka',
    practiceArea: 'General'
  });

  // Basic Validation
  const validateForm = () => {
    if (roleType === 'citizen') {
      if (!citizenForm.fullName.trim()) return language === 'bn' ? 'সম্পূর্ণ নাম (ইংরেজি) প্রদান করুন' : 'Full name is required';
      if (!citizenForm.phone.trim()) return language === 'bn' ? 'মোবাইল নম্বর প্রদান করুন' : 'Phone number is required';
      if (citizenForm.isRepresentative && !citizenForm.representedPerson.trim()) {
        return language === 'bn' ? 'কার পক্ষে প্রতিনিধিত্ব করছেন তার নাম উল্লেখ করুন' : 'Please specify on whose behalf you are representing';
      }
    } else if (roleType === 'officer') {
      if (!officerForm.fullName.trim()) return language === 'bn' ? 'সম্পূর্ণ নাম প্রদান করুন' : 'Full name is required';
      if (!officerForm.staffId.trim()) return language === 'bn' ? 'স্টাফ আইডি প্রদান করুন' : 'Staff ID is required';
    } else if (roleType === 'lawyer') {
      if (!lawyerForm.fullName.trim()) return language === 'bn' ? 'সম্পূর্ণ নাম প্রদান করুন' : 'Full name is required';
      if (!lawyerForm.barId.trim()) return language === 'bn' ? 'বার বা প্যানেল এনরোলমেন্ট আইডি প্রদান করুন' : 'Bar/Panel Enrollment ID is required';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const validationErr = validateForm();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setSubmitting(true);

    try {
      let payload = {};
      let createdIdentifier = '';

      if (roleType === 'citizen') {
        payload = {
          role_category: 'citizen',
          full_name: citizenForm.fullName,
          full_name_bn: citizenForm.fullNameBn,
          phone: citizenForm.phone,
          national_id: citizenForm.nationalId || null,
          division: citizenForm.division,
          district: citizenForm.district,
          is_representative: citizenForm.isRepresentative,
          represented_person: citizenForm.isRepresentative ? citizenForm.representedPerson : null
        };
        createdIdentifier = citizenForm.phone || citizenForm.nationalId || citizenForm.fullName;
      } else if (roleType === 'officer') {
        payload = {
          role_category: 'officer',
          full_name: officerForm.fullName,
          full_name_bn: officerForm.fullNameBn,
          staff_id: officerForm.staffId,
          phone: officerForm.phone,
          division: officerForm.division,
          district: officerForm.district,
          office: officerForm.office || `DLAO ${officerForm.district}`,
          sub_role: officerForm.subRole
        };
        createdIdentifier = officerForm.staffId;
      } else if (roleType === 'lawyer') {
        payload = {
          role_category: 'lawyer',
          full_name: lawyerForm.fullName,
          full_name_bn: lawyerForm.fullNameBn,
          bar_id: lawyerForm.barId,
          phone: lawyerForm.phone,
          division: lawyerForm.division,
          district: lawyerForm.district,
          practice_area: lawyerForm.practiceArea
        };
        createdIdentifier = lawyerForm.barId;
      }

      // Real backend write using person-creation logic
      const response = await api.registerPerson(payload);

      setSuccessInfo({
        roleType,
        identifier: createdIdentifier,
        person: response.data,
        message: language === 'bn' ? 'নিবন্ধন সফল — এখন লগইন করুন' : 'Registration Successful — Please Login Now'
      });
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.message || (language === 'bn' ? 'নিবন্ধন ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।' : 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Back bar */}
      <div className="auth-back-strip">
        <button
          type="button"
          className="btn-back-link"
          onClick={onBackToLanding}
          aria-label="Back to home"
        >
          <IconArrowLeft size={18} />
          <span>{language === 'bn' ? 'মূল পাতায় ফিরে যান' : 'Back to Home'}</span>
        </button>
      </div>

      <div className="auth-card-wrapper">
        <div className="auth-header">
          <div className="auth-emblem-row">
            <span className="auth-scales">⚖️</span>
            <span className="auth-badge-text">
              {language === 'bn' ? 'ডিজিটাল লিগ্যাল এইড নিবন্ধন' : 'DLAS Registration'}
            </span>
          </div>
          <h1 className="auth-title">
            {language === 'bn' ? 'নতুন ব্যবহারকারী নিবন্ধন' : 'Register New Account'}
          </h1>
          <p className="auth-subtitle">
            {language === 'bn'
              ? 'আইনি সেবা গ্রহণ বা প্রদানের জন্য আপনার সঠিক পদবী নির্বাচন করে তথ্য পূরণ করুন'
              : 'Fill in your details below to register for institutional legal aid access'}
          </p>

          {/* Role selection tab bar */}
          <div className="auth-role-tabs" role="tablist">
            <button
              type="button"
              className={`auth-role-tab ${roleType === 'citizen' ? 'active' : ''}`}
              onClick={() => { setRoleType('citizen'); setError(null); setSuccessInfo(null); }}
              role="tab"
              aria-selected={roleType === 'citizen'}
            >
              <IconCitizen size={18} />
              <span>{language === 'bn' ? 'নাগরিক' : 'Citizen'}</span>
            </button>
            <button
              type="button"
              className={`auth-role-tab ${roleType === 'officer' ? 'active' : ''}`}
              onClick={() => { setRoleType('officer'); setError(null); setSuccessInfo(null); }}
              role="tab"
              aria-selected={roleType === 'officer'}
            >
              <IconOfficer size={18} />
              <span>{language === 'bn' ? 'কর্মকর্তা' : 'Officer'}</span>
            </button>
            <button
              type="button"
              className={`auth-role-tab ${roleType === 'lawyer' ? 'active' : ''}`}
              onClick={() => { setRoleType('lawyer'); setError(null); setSuccessInfo(null); }}
              role="tab"
              aria-selected={roleType === 'lawyer'}
            >
              <IconLawyer size={18} />
              <span>{language === 'bn' ? 'আইনজীবী' : 'Lawyer'}</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successInfo ? (
          <div className="auth-success-banner" role="status">
            <div className="success-icon-wrap">
              <IconCheckCircle size={32} className="success-check-icon" />
            </div>
            <div className="success-content">
              <h3>{language === 'bn' ? 'নিবন্ধন সফল — এখন লগইন করুন' : 'Registration Successful — Please Login Now'}</h3>
              <p>
                {language === 'bn'
                  ? `আপনার অ্যাকাউন্ট তৈরি হয়েছে। আপনার আইডি/নম্বর: "${successInfo.identifier}"`
                  : `Your identity has been saved. Your ID/Number: "${successInfo.identifier}"`}
              </p>
              <div className="success-actions">
                <button
                  type="button"
                  id="btn-goto-login-after-reg"
                  className="btn-portal-primary"
                  onClick={() => onNavigateLogin(successInfo.roleType, successInfo.identifier)}
                >
                  <span>{language === 'bn' ? 'লগইন পাতায় যান' : 'Go to Login'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="auth-error-banner" role="alert">
                <IconAlertTriangle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* =========================================================================
                FORM 1: CITIZEN REGISTER
                ========================================================================= */}
            {roleType === 'citizen' && (
              <div className="form-role-fields" id="citizen-fields">
                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="reg-citizen-name">
                      {language === 'bn' ? 'পূর্ণ নাম (ইংরেজি) *' : 'Full Name (English) *'}
                    </label>
                    <input
                      id="reg-citizen-name"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Moyuri Akter"
                      value={citizenForm.fullName}
                      onChange={(e) => setCitizenForm({ ...citizenForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-citizen-name-bn">
                      {language === 'bn' ? 'পূর্ণ নাম (বাংলা)' : 'Full Name (Bangla)'}
                    </label>
                    <input
                      id="reg-citizen-name-bn"
                      type="text"
                      className="form-input"
                      placeholder="যেমন: ময়ূরী আক্তার"
                      value={citizenForm.fullNameBn}
                      onChange={(e) => setCitizenForm({ ...citizenForm, fullNameBn: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="reg-citizen-phone">
                      {language === 'bn' ? 'মোবাইল নম্বর *' : 'Phone Number *'}
                    </label>
                    <input
                      id="reg-citizen-phone"
                      type="tel"
                      className="form-input"
                      placeholder="017XXXXXXXX"
                      value={citizenForm.phone}
                      onChange={(e) => setCitizenForm({ ...citizenForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-citizen-nid">
                      {language === 'bn' ? 'জাতীয় পরিচয়পত্র নম্বর (ঐচ্ছিক)' : 'NID Number (Optional)'}
                      <span className="field-hint-text">
                        {language === 'bn' ? '(নাগরিকদের এনআইডি না থাকলেও আবেদন সম্ভব)' : '(Citizens without NID are accommodated)'}
                      </span>
                    </label>
                    <input
                      id="reg-citizen-nid"
                      type="text"
                      className="form-input"
                      placeholder="NID-1998XXXXXXXX"
                      value={citizenForm.nationalId}
                      onChange={(e) => setCitizenForm({ ...citizenForm, nationalId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="reg-citizen-division">
                      {language === 'bn' ? 'বিভাগ *' : 'Division *'}
                    </label>
                    <select
                      id="reg-citizen-division"
                      className="form-select"
                      value={citizenForm.division}
                      onChange={(e) => setCitizenForm({ ...citizenForm, division: e.target.value })}
                    >
                      {divisions.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-citizen-district">
                      {language === 'bn' ? 'জেলা *' : 'District *'}
                    </label>
                    <input
                      id="reg-citizen-district"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Dhaka, Sylhet, Rangamati"
                      value={citizenForm.district}
                      onChange={(e) => setCitizenForm({ ...citizenForm, district: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Representative Checkbox */}
                <div className="representative-toggle-card">
                  <label className="checkbox-container">
                    <input
                      id="chk-representative"
                      type="checkbox"
                      checked={citizenForm.isRepresentative}
                      onChange={(e) => setCitizenForm({ ...citizenForm, isRepresentative: e.target.checked })}
                    />
                    <span className="checkbox-custom"></span>
                    <span className="checkbox-label">
                      <strong>
                        {language === 'bn'
                          ? 'আমি কাউকে প্রতিনিধিত্ব করছি (Authorized Representative)'
                          : 'I am representing someone (Authorized Representative)'}
                      </strong>
                    </span>
                  </label>

                  {citizenForm.isRepresentative && (
                    <div className="rep-child-field">
                      <label htmlFor="reg-rep-behalf">
                        {language === 'bn' ? 'কার পক্ষে আবেদন করছেন? (নাম ও সম্পর্ক) *' : 'On whose behalf are you applying? (Name & relation) *'}
                      </label>
                      <input
                        id="reg-rep-behalf"
                        type="text"
                        className="form-input"
                        placeholder="যেমন: ময়ূরী আক্তার (আমার বোন)"
                        value={citizenForm.representedPerson}
                        onChange={(e) => setCitizenForm({ ...citizenForm, representedPerson: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================================
                FORM 2: SERVICE OFFICER REGISTER
                ========================================================================= */}
            {roleType === 'officer' && (
              <div className="form-role-fields" id="officer-fields">
                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="reg-officer-name">
                      {language === 'bn' ? 'কর্মকর্তার পূর্ণ নাম *' : 'Officer Full Name *'}
                    </label>
                    <input
                      id="reg-officer-name"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Shamsul Huda"
                      value={officerForm.fullName}
                      onChange={(e) => setOfficerForm({ ...officerForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-officer-staffid">
                      {language === 'bn' ? 'স্টাফ / অফিসিয়াল আইডি *' : 'Staff / Official ID *'}
                    </label>
                    <input
                      id="reg-officer-staffid"
                      type="text"
                      className="form-input"
                      placeholder="e.g. DLAO-STAFF-101"
                      value={officerForm.staffId}
                      onChange={(e) => setOfficerForm({ ...officerForm, staffId: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="reg-officer-subrole">
                      {language === 'bn' ? 'নির্দিষ্ট পদবী / সাব-রোল *' : 'Assigned Sub-Role *'}
                    </label>
                    <select
                      id="reg-officer-subrole"
                      className="form-select"
                      value={officerForm.subRole}
                      onChange={(e) => setOfficerForm({ ...officerForm, subRole: e.target.value })}
                    >
                      <option value="B1_DLAO_OFFICER">[B1] DLAO Officer / ডিএলএও কর্মকর্তা</option>
                      <option value="B2_LEGAL_AID_OFFICER">[B2] Legal Aid Officer & Mediator / মধ্যস্থতাকারী</option>
                      <option value="B3_HELPLINE_AGENT">[B3] 16699 Helpline Agent / হেল্পলাইন এজেন্ট</option>
                      <option value="B4_UDC_ENTREPRENEUR">[B4] UDC Entrepreneur / ইউডিসি উদ্যোক্তা</option>
                      <option value="B7_DLAO_ADMIN">[B7] DLAO Admin-Support Staff / প্রশাসনিক কর্মী</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-officer-office">
                      {language === 'bn' ? 'ডিএলএও অফিস / এখতিয়ার *' : 'DLAO Office / Jurisdiction *'}
                    </label>
                    <input
                      id="reg-officer-office"
                      type="text"
                      className="form-input"
                      placeholder="e.g. DLAO Dhaka, DLAO Rangamati"
                      value={officerForm.office}
                      onChange={(e) => setOfficerForm({ ...officerForm, office: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="reg-officer-phone">
                      {language === 'bn' ? 'অফিসিয়াল ফোন নম্বর' : 'Official Phone Number'}
                    </label>
                    <input
                      id="reg-officer-phone"
                      type="tel"
                      className="form-input"
                      placeholder="017XXXXXXXX"
                      value={officerForm.phone}
                      onChange={(e) => setOfficerForm({ ...officerForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-officer-district">
                      {language === 'bn' ? 'জেলা' : 'District'}
                    </label>
                    <input
                      id="reg-officer-district"
                      type="text"
                      className="form-input"
                      value={officerForm.district}
                      onChange={(e) => setOfficerForm({ ...officerForm, district: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                FORM 3: PANEL LAWYER REGISTER
                ========================================================================= */}
            {roleType === 'lawyer' && (
              <div className="form-role-fields" id="lawyer-fields">
                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="reg-lawyer-name">
                      {language === 'bn' ? 'আইনজীবীর পূর্ণ নাম *' : 'Advocate Full Name *'}
                    </label>
                    <input
                      id="reg-lawyer-name"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Advocate Farhana Yasmin"
                      value={lawyerForm.fullName}
                      onChange={(e) => setLawyerForm({ ...lawyerForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-lawyer-barid">
                      {language === 'bn' ? 'বার / প্যানেল এনরোলমেন্ট আইডি *' : 'Bar / Panel Enrollment ID *'}
                    </label>
                    <input
                      id="reg-lawyer-barid"
                      type="text"
                      className="form-input"
                      placeholder="e.g. BAR-SYLHET-2026"
                      value={lawyerForm.barId}
                      onChange={(e) => setLawyerForm({ ...lawyerForm, barId: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="reg-lawyer-district">
                      {language === 'bn' ? 'বার অ্যাসোসিয়েশন জেলা *' : 'Bar Association District *'}
                    </label>
                    <input
                      id="reg-lawyer-district"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sylhet, Dhaka"
                      value={lawyerForm.district}
                      onChange={(e) => setLawyerForm({ ...lawyerForm, district: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-lawyer-practice">
                      {language === 'bn' ? 'প্র্যাকটিসের ক্ষেত্র *' : 'Area of Practice *'}
                    </label>
                    <select
                      id="reg-lawyer-practice"
                      className="form-select"
                      value={lawyerForm.practiceArea}
                      onChange={(e) => setLawyerForm({ ...lawyerForm, practiceArea: e.target.value })}
                    >
                      <option value="Family Law">Family Law / পারিবারিক আইন</option>
                      <option value="Labor Disputes">Labor Law / শ্রম আইন</option>
                      <option value="Cyber & Digital Security">Cyber & Digital Law / সাইবার অপরাধ</option>
                      <option value="Land & Property">Land & Property / ভূমি ও সম্পত্তি</option>
                      <option value="General Civil & Criminal">General Civil & Criminal / সাধারণ দেওয়ানি ও ফৌজদারি</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reg-lawyer-phone">
                    {language === 'bn' ? 'যোগাযোগের মোবাইল নম্বর' : 'Contact Phone Number'}
                  </label>
                  <input
                    id="reg-lawyer-phone"
                    type="tel"
                    className="form-input"
                    placeholder="017XXXXXXXX"
                    value={lawyerForm.phone}
                    onChange={(e) => setLawyerForm({ ...lawyerForm, phone: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="auth-form-submit-row">
              <button
                type="submit"
                id="btn-submit-register"
                className="btn-portal-primary btn-submit-full"
                disabled={submitting}
              >
                <span>
                  {submitting
                    ? (language === 'bn' ? 'নিবন্ধন করা হচ্ছে...' : 'Registering...')
                    : (language === 'bn' ? 'নিবন্ধন সম্পন্ন করুন' : 'Complete Registration')}
                </span>
              </button>
            </div>

            <div className="auth-switch-link">
              <span>{language === 'bn' ? 'ইতিমধ্যে নিবন্ধিত?' : 'Already have an account?'}</span>
              <button
                type="button"
                className="btn-inline-link"
                onClick={() => onNavigateLogin(roleType)}
              >
                {language === 'bn' ? 'এখানে লগইন করুন' : 'Login here'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
