import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import { useRole } from '../hooks/useRole';
import api from '../services/api';
import {
  IconCitizen,
  IconOfficer,
  IconLawyer,
  IconLogin,
  IconArrowLeft,
  IconAlertTriangle,
  IconShield,
  IconHelpCircle
} from '../components/Icons';

export default function LoginPage({
  initialRole = 'citizen',
  prefilledIdentifier = '',
  onLoginSuccess,
  onNavigateRegister,
  onBackToLanding
}) {
  const { language } = useLanguage();
  const { login } = useRole();

  const [roleType, setRoleType] = useState(initialRole); // 'citizen' | 'officer' | 'lawyer'
  const [identifier, setIdentifier] = useState(prefilledIdentifier || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Demo selector state
  const [selectedDemoId, setSelectedDemoId] = useState('');
  const [registeredPeople, setRegisteredPeople] = useState([]);

  // Fetch recent people from backend to supplement demo shortcuts
  useEffect(() => {
    api.getPeople()
      .then(res => {
        if (res?.data) {
          setRegisteredPeople(res.data);
        }
      })
      .catch(err => console.warn('Could not fetch people list:', err));
  }, []);

  // Update identifier if prop changes
  useEffect(() => {
    if (prefilledIdentifier) {
      setIdentifier(prefilledIdentifier);
    }
  }, [prefilledIdentifier]);

  // Seeded Demo Person Database
  const demoIdentities = {
    citizen: [
      {
        id: 'PER-CITIZEN-MOYURI',
        name: 'Moyuri Akter (ময়ূরী আক্তার)',
        roleId: 'CITIZEN_APPLICANT',
        identifier: '01822000101',
        subtitle: 'Applicant — Domestic Violence Survivor (Mirpur, Dhaka)',
        targetPortal: 'citizen-portal'
      },
      {
        id: 'PER-CITIZEN-RIPON',
        name: 'Ripon (রিপন)',
        roleId: 'AUTHORIZED_REPRESENTATIVE',
        identifier: '01822000202',
        subtitle: 'Authorized Representative — Brother & Non-visual assisted',
        targetPortal: 'representative-portal'
      },
      {
        id: 'PER-CITIZEN-RASHIDA',
        name: 'Rashida Begum (রাশিদা বেগম)',
        roleId: 'CITIZEN_APPLICANT',
        identifier: '01822000303',
        subtitle: 'Applicant — Labor Rights & Wage Claim (Gazipur)',
        targetPortal: 'citizen-portal'
      },
      {
        id: 'PER-CITIZEN-NUCHING',
        name: 'Nuching Marma (নূচিং মারমা)',
        roleId: 'CITIZEN_APPLICANT',
        identifier: '01822000404',
        subtitle: 'Applicant — CHT Indigenous Land Dispute (Rangamati)',
        targetPortal: 'citizen-portal'
      }
    ],
    officer: [
      {
        id: 'PER-OFFICER-B1',
        name: 'Shamsul Huda (শামসুল হুদা)',
        roleId: 'B1_DLAO_OFFICER',
        identifier: 'PER-OFFICER-B1',
        subtitle: 'DLAO District Officer — Dhaka Central',
        targetPortal: 'cases'
      },
      {
        id: 'PER-MEDIATOR-B2',
        name: 'Rokeya Sultana (রোকেয়া সুলতানা)',
        roleId: 'B2_LEGAL_AID_OFFICER',
        identifier: 'PER-MEDIATOR-B2',
        subtitle: 'Legal Aid Officer & Formal Mediator — ADR Unit',
        targetPortal: 'cases'
      },
      {
        id: 'PER-HELPLINE-B3',
        name: 'Tariqul Islam (তরিকুল ইসলাম)',
        roleId: 'B3_HELPLINE_AGENT',
        identifier: 'PER-HELPLINE-B3',
        subtitle: '16699 National Legal Aid Helpline Agent',
        targetPortal: 'cases'
      },
      {
        id: 'PER-UDC-B4',
        name: 'Minu Akhter (মিনু আক্তার)',
        roleId: 'B4_UDC_ENTREPRENEUR',
        identifier: 'PER-UDC-B4',
        subtitle: 'Union Digital Center Entrepreneur — Baghaichhari, Rangamati',
        targetPortal: 'udc-portal'
      },
      {
        id: 'PER-ADMIN-B7',
        name: 'Mahmudul Hasan (মাহমুদুল হাসান)',
        roleId: 'B7_DLAO_ADMIN',
        identifier: 'PER-ADMIN-B7',
        subtitle: 'DLAO Admin & System Registry Support Staff',
        targetPortal: 'cases'
      }
    ],
    lawyer: [
      {
        id: 'PER-LAWYER-B5',
        name: 'Advocate Farhana Yasmin (অ্যাডভোকেট ফারহানা ইয়াসমিন)',
        roleId: 'B5_PANEL_LAWYER',
        identifier: 'PER-LAWYER-B5',
        subtitle: 'Panel Lawyer — Sylhet District Bar Association',
        targetPortal: 'cases'
      }
    ]
  };

  // Combine seeded demo items with any newly registered people for this role
  const currentDemoList = [
    ...(demoIdentities[roleType] || []),
    ...registeredPeople
      .filter(p => {
        if (roleType === 'citizen') return p.role_id === 'CITIZEN_APPLICANT' || p.role_id === 'AUTHORIZED_REPRESENTATIVE';
        if (roleType === 'officer') return ['B1_DLAO_OFFICER', 'B2_LEGAL_AID_OFFICER', 'B3_HELPLINE_AGENT', 'B4_UDC_ENTREPRENEUR', 'B7_DLAO_ADMIN'].includes(p.role_id);
        if (roleType === 'lawyer') return p.role_id === 'B5_PANEL_LAWYER';
        return false;
      })
      .filter(p => !['PER-OFFICER-B1', 'PER-MEDIATOR-B2', 'PER-HELPLINE-B3', 'PER-UDC-B4', 'PER-LAWYER-B5', 'PER-ADMIN-B7', 'PER-CITIZEN-MOYURI', 'PER-CITIZEN-RIPON', 'PER-CITIZEN-RASHIDA', 'PER-CITIZEN-NUCHING'].includes(p.id))
      .map(p => ({
        id: p.id,
        name: `${p.full_name} (${p.full_name_bn || 'New'})`,
        roleId: p.role_id,
        identifier: p.phone || p.national_id || p.id,
        subtitle: `Registered User — ${p.district || 'Dhaka'}`,
        targetPortal: p.role_id === 'AUTHORIZED_REPRESENTATIVE'
          ? 'representative-portal'
          : p.role_id === 'B4_UDC_ENTREPRENEUR'
          ? 'udc-portal'
          : p.role_id === 'CITIZEN_APPLICANT'
          ? 'citizen-portal'
          : 'cases'
      }))
  ];

  // Resolve target portal based on role
  const resolveTargetPortal = (roleId) => {
    if (roleId === 'AUTHORIZED_REPRESENTATIVE') return 'representative-portal';
    if (roleId === 'B4_UDC_ENTREPRENEUR') return 'udc-portal';
    if (roleId === 'CITIZEN_APPLICANT') return 'citizen-portal';
    return 'cases'; // DLAO Officers, Mediators, Helpline, Admin, Lawyers
  };

  // 1. Submit REAL login form lookup
  const handleRealLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setNotFound(false);

    if (!identifier.trim()) {
      setErrorMsg(language === 'bn' ? 'অনুগ্রহ করে আইডি বা ফোন নম্বর প্রদান করুন' : 'Please provide your ID or Phone Number');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.lookupPerson({
        role_category: roleType,
        identifier: identifier.trim()
      });

      if (res?.data) {
        const person = res.data;
        const targetRoleId = person.role_id || (roleType === 'lawyer' ? 'B5_PANEL_LAWYER' : (roleType === 'citizen' ? 'CITIZEN_APPLICANT' : 'B1_DLAO_OFFICER'));
        login(person, targetRoleId);
        const portal = resolveTargetPortal(targetRoleId);
        onLoginSuccess(portal, targetRoleId);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.warn('Login lookup error:', err);
      if (err.status === 404 || err.data?.not_found) {
        setNotFound(true);
      } else {
        setErrorMsg(err.message || (language === 'bn' ? 'লগইন প্রক্রিয়াকরণে ত্রুটি হয়েছে' : 'Error processing login'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Submit DEMO Identity Shortcut
  const handleDemoLogin = (e) => {
    e.preventDefault();
    if (!selectedDemoId) return;

    const matched = currentDemoList.find(d => d.id === selectedDemoId);
    if (!matched) return;

    const personPayload = {
      id: matched.id,
      full_name: matched.name.split(' (')[0],
      full_name_bn: matched.name.includes('(') ? matched.name.split('(')[1].replace(')', '') : '',
      role_id: matched.roleId,
      district: 'Dhaka',
      office: 'DLAO Dhaka'
    };

    login(personPayload, matched.roleId);
    const portal = matched.targetPortal || resolveTargetPortal(matched.roleId);
    onLoginSuccess(portal, matched.roleId);
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
              {language === 'bn' ? 'ডিজিটাল লিগ্যাল এইড সিস্টেম' : 'ADLASB Institutional Portal'}
            </span>
          </div>
          <h1 className="auth-title">
            {roleType === 'citizen' && (language === 'bn' ? 'নাগরিক সেবা প্রবেশদ্বার' : 'Citizen Service Login')}
            {roleType === 'officer' && (language === 'bn' ? 'কর্মকর্তা ও প্রশাসন প্রবেশদ্বার' : 'Service Officer Login')}
            {roleType === 'lawyer' && (language === 'bn' ? 'প্যানেল আইনজীবী প্রবেশদ্বার' : 'Panel Lawyer Login')}
          </h1>
          <p className="auth-subtitle">
            {roleType === 'citizen' && (language === 'bn' ? 'আপনার নিবন্ধিত মোবাইল নম্বর বা জাতীয় পরিচয়পত্র দিয়ে প্রবেশ করুন' : 'Log in with your registered phone number or National ID')}
            {roleType === 'officer' && (language === 'bn' ? 'আপনার স্টাফ আইডি বা অফিসিয়াল পরিচয় দিয়ে প্রবেশ করুন' : 'Log in with your official staff credentials or assigned officer ID')}
            {roleType === 'lawyer' && (language === 'bn' ? 'আপনার বার বা প্যানেল এনরোলমেন্ট আইডি দিয়ে প্রবেশ করুন' : 'Log in with your bar association or panel enrollment ID')}
          </p>

          {/* Role selector tabs */}
          <div className="auth-role-tabs" role="tablist">
            <button
              type="button"
              className={`auth-role-tab ${roleType === 'citizen' ? 'active' : ''}`}
              onClick={() => { setRoleType('citizen'); setErrorMsg(null); setNotFound(false); setSelectedDemoId(''); }}
              role="tab"
              aria-selected={roleType === 'citizen'}
            >
              <IconCitizen size={18} />
              <span>{language === 'bn' ? 'নাগরিক' : 'Citizen'}</span>
            </button>
            <button
              type="button"
              className={`auth-role-tab ${roleType === 'officer' ? 'active' : ''}`}
              onClick={() => { setRoleType('officer'); setErrorMsg(null); setNotFound(false); setSelectedDemoId(''); }}
              role="tab"
              aria-selected={roleType === 'officer'}
            >
              <IconOfficer size={18} />
              <span>{language === 'bn' ? 'কর্মকর্তা' : 'Officer'}</span>
            </button>
            <button
              type="button"
              className={`auth-role-tab ${roleType === 'lawyer' ? 'active' : ''}`}
              onClick={() => { setRoleType('lawyer'); setErrorMsg(null); setNotFound(false); setSelectedDemoId(''); }}
              role="tab"
              aria-selected={roleType === 'lawyer'}
            >
              <IconLawyer size={18} />
              <span>{language === 'bn' ? 'আইনজীবী' : 'Lawyer'}</span>
            </button>
          </div>
        </div>

        {/* Not Found Alert (as explicitly mandated in Part 3) */}
        {notFound && (
          <div className="auth-notfound-banner" role="alert" id="auth-not-found-message">
            <div className="notfound-icon-wrap">
              <IconAlertTriangle size={24} />
            </div>
            <div className="notfound-body">
              <strong>{language === 'bn' ? 'পাওয়া যায়নি — অনুগ্রহ করে নিবন্ধন করুন' : 'Not found — please register'}</strong>
              <p>
                {language === 'bn'
                  ? `"${identifier}" নম্বরে কোনো সক্রিয় বা নিবন্ধিত প্রোফাইল খুঁজে পাওয়া যায়নি। সেবায় যুক্ত হতে দয়া করে নিবন্ধন করুন।`
                  : `No profile matching "${identifier}" was found. Please complete a quick registration to access your portal.`}
              </p>
              <button
                type="button"
                id="btn-goto-register-from-notfound"
                className="btn-register-redirect"
                onClick={() => onNavigateRegister(roleType)}
              >
                <span>{language === 'bn' ? 'এখনই নিবন্ধন করুন' : 'Register Now'}</span>
              </button>
            </div>
          </div>
        )}

        {errorMsg && !notFound && (
          <div className="auth-error-banner" role="alert">
            <IconAlertTriangle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* =========================================================================
            REAL LOGIN FORM
            ========================================================================= */}
        <form className="auth-form" onSubmit={handleRealLogin} noValidate>
          <div className="form-group">
            <label htmlFor="login-identifier-input">
              {roleType === 'citizen' && (language === 'bn' ? 'মোবাইল নম্বর অথবা এনআইডি নম্বর *' : 'Phone Number or NID *')}
              {roleType === 'officer' && (language === 'bn' ? 'স্টাফ আইডি অথবা ফোন নম্বর *' : 'Staff ID or Phone Number *')}
              {roleType === 'lawyer' && (language === 'bn' ? 'প্যানেল বা বার এনরোলমেন্ট আইডি *' : 'Bar / Panel Enrollment ID *')}
            </label>
            <input
              id="login-identifier-input"
              type="text"
              className="form-input form-input-lg"
              placeholder={
                roleType === 'citizen'
                  ? (language === 'bn' ? 'যেমন: 01822000101 অথবা NID-199856100101' : 'e.g. 01822000101 or NID-199856100101')
                  : roleType === 'officer'
                  ? (language === 'bn' ? 'যেমন: PER-OFFICER-B1 অথবা 01711000001' : 'e.g. PER-OFFICER-B1 or 01711000001')
                  : (language === 'bn' ? 'যেমন: PER-LAWYER-B5 অথবা BAR-SYLHET-2026' : 'e.g. PER-LAWYER-B5 or 01711000005')
              }
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setNotFound(false);
                setErrorMsg(null);
              }}
              required
            />
            <span className="field-hint-text">
              {roleType === 'citizen' && (language === 'bn' ? 'আপনার আবেদনের সময় প্রদত্ত যেকোনো ফোন বা এনআইডি নম্বর' : 'Enter the phone or NID used during application')}
              {roleType === 'officer' && (language === 'bn' ? 'ডিএলএও প্রশাসন কর্তৃক প্রদত্ত অভ্যন্তরীণ অফিসিয়াল আইডি' : 'Official identifier registered in DLAO staff registry')}
              {roleType === 'lawyer' && (language === 'bn' ? 'জেলা বার অ্যাসোসিয়েশন বা লিগ্যাল এইড প্যানেল তালিকাভুক্তি নম্বর' : 'Panel roster enrollment code or bar license number')}
            </span>
          </div>

          <div className="auth-form-submit-row">
            <button
              type="submit"
              id="btn-submit-real-login"
              className="btn-portal-primary btn-submit-full"
              disabled={submitting}
            >
              <IconLogin size={18} />
              <span>
                {submitting
                  ? (language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying...')
                  : (language === 'bn' ? 'প্রবেশ করুন' : 'Sign In')}
              </span>
            </button>
          </div>

          <div className="auth-switch-link">
            <span>{language === 'bn' ? 'নতুন ব্যবহারকারী?' : 'New to ADLASB?'}</span>
            <button
              type="button"
              className="btn-inline-link"
              onClick={() => onNavigateRegister(roleType)}
            >
              {language === 'bn' ? 'এখানে নিবন্ধন করুন' : 'Register here'}
            </button>
          </div>
        </form>

        {/* =========================================================================
            DEMO SHORTCUT SECTION (Explicitly labeled for Jury / Test Evaluation)
            ========================================================================= */}
        <div className="demo-shortcut-divider">
          <span className="divider-text">
            {language === 'bn' ? 'অথবা জুরি ও মূল্যায়নের শর্টকাট' : 'Or Jury Evaluation Shortcut'}
          </span>
        </div>

        <div className="demo-shortcut-card">
          <div className="demo-header-badge">
            <span className="badge-pill">JURY EVALUATION SHORTCUT</span>
          </div>
          <h4 className="demo-title">
            {language === 'bn'
              ? 'অথবা একটি ডেমো পরিচয় বেছে নিন'
              : 'Or select a demo identity'}
          </h4>
          <p className="demo-desc">
            {language === 'bn'
              ? 'মূল্যায়নকারী ও পরীক্ষকদের জন্য তাত্ক্ষণিক এক-ক্লিক প্রবেশের সুযোগ। কোনো নিবন্ধন ছাড়াই সরাসরি টেস্ট অ্যাকাউন্টে প্রবেশ করুন।'
              : 'One-click evaluation shortcut for judges and testers. Explore pre-seeded case scenarios instantly.'}
          </p>

          <form onSubmit={handleDemoLogin} className="demo-form">
            <div className="form-group">
              <label htmlFor="demo-identity-select" className="demo-select-label">
                {language === 'bn' ? 'ডেমো পরিচয় নির্বাচন করুন:' : 'Select Demo Persona:'}
              </label>
              <select
                id="demo-identity-select"
                className="form-select demo-select"
                value={selectedDemoId}
                onChange={(e) => {
                  setSelectedDemoId(e.target.value);
                  const found = currentDemoList.find(d => d.id === e.target.value);
                  if (found) {
                    setIdentifier(found.identifier);
                  }
                }}
              >
                <option value="">
                  {language === 'bn' ? '-- একটি ডেমো পরিচয় পছন্দ করুন --' : '-- Choose a pre-seeded identity --'}
                </option>
                {currentDemoList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — [{d.roleId}]
                  </option>
                ))}
              </select>
            </div>

            {selectedDemoId && (
              <div className="selected-demo-info">
                <span className="demo-role-badge">
                  {currentDemoList.find(d => d.id === selectedDemoId)?.subtitle}
                </span>
              </div>
            )}

            <button
              type="submit"
              id="btn-submit-demo-login"
              className="btn-demo-login"
              disabled={!selectedDemoId}
            >
              <IconLogin size={16} />
              <span>{language === 'bn' ? 'ডেমো হিসেবে সরাসরি প্রবেশ করুন' : 'Login as Demo Identity'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
