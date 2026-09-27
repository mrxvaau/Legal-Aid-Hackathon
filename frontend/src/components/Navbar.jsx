import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import { useRole } from '../hooks/useRole';
import AccessibilityToolbar from './AccessibilityToolbar';

export default function Navbar({ currentView, setCurrentView }) {
  const { language, toggleLanguage, t } = useLanguage();
  const { activeRole, currentRoleId, setRole, AVAILABLE_ROLES } = useRole();
  const [a11yOpen, setA11yOpen] = useState(false);

  const handleRoleChange = (e) => {
    const newRoleId = e.target.value;
    setRole(newRoleId);
    if (newRoleId === 'AUTHORIZED_REPRESENTATIVE') {
      setCurrentView('representative-portal');
    } else if (newRoleId === 'B4_UDC_ENTREPRENEUR') {
      setCurrentView('udc-portal');
    }
  };

  const currentDateBn = 'রবিবার, ২৭ সেপ্টেম্বর ২০২৬';
  const currentDateEn = 'Sunday, 27 September 2026';

  return (
    <header className="gov-header" role="banner">
      {/* =========================================================================
          TIER 1: Top Micro-bar (Date, Helpline, Accessibility & Language)
          ========================================================================= */}
      <div className="gov-top-microbar">
        <div className="microbar-inner">
          <div className="microbar-left">
            <span className="microbar-date">
              📅 {language === 'bn' ? currentDateBn : currentDateEn}
            </span>
            <span className="microbar-divider">|</span>
            <span className="microbar-helpline">
              📞 {language === 'bn' ? 'জাতীয় লিগ্যাল এইড হেল্পলাইন: ' : 'National Legal Aid Helpline: '}
              <strong>১৬৬৯৯ (টোল-ফ্রি)</strong>
            </span>
          </div>

          <div className="microbar-right">
            {/* Accessibility Panel Toggle */}
            <button
              type="button"
              className={`microbar-btn a11y-trigger ${a11yOpen ? 'active' : ''}`}
              onClick={() => setA11yOpen(!a11yOpen)}
              title={language === 'bn' ? 'সহজপ্রবেশ্যতা সরঞ্জাম' : 'Accessibility Options'}
              aria-expanded={a11yOpen}
            >
              <span aria-hidden="true">♿</span>
              <span>{language === 'bn' ? 'সহজপ্রবেশ্যতা' : 'Accessibility'}</span>
            </button>

            <span className="microbar-divider">|</span>

            {/* Language Switcher */}
            <button
              type="button"
              className="microbar-btn lang-toggle"
              onClick={toggleLanguage}
              title={language === 'en' ? 'Switch to Bangla' : 'Switch to English'}
              aria-label={language === 'en' ? 'Switch interface language to Bangla' : 'Switch interface language to English'}
            >
              🌐 <span className="lang-text">{language === 'en' ? 'বাংলা' : 'English'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Accessibility Panel Drawer */}
      <AccessibilityToolbar isOpen={a11yOpen} onClose={() => setA11yOpen(false)} />

      {/* =========================================================================
          TIER 2: Institutional Masthead (3-Line Hierarchy + Department Identity)
          ========================================================================= */}
      <div className="gov-masthead">
        <div className="masthead-inner">
          <div
            className="masthead-brand"
            onClick={() => setCurrentView('cases')}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCurrentView('cases'); }}
            aria-label="Home - ADLASB National Legal Aid Platform"
          >
            {/* National Judicial Scales Emblem */}
            <div className="gov-emblem-badge" aria-hidden="true">
              <span className="emblem-symbol">⚖️</span>
            </div>

            <div className="masthead-titles">
              <span className="gov-hierarchy-tier1">
                {language === 'bn'
                  ? 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার | আইন ও বিচার বিভাগ'
                  : "Government of the People's Republic of Bangladesh | Law and Justice Division"}
              </span>
              <span className="gov-hierarchy-tier2">
                {language === 'bn'
                  ? 'জাতীয় আইনগত সহায়তা প্রদান সংস্থা (NLASO) — জেলা লিগ্যাল এইড অফিস (DLAO)'
                  : 'National Legal Aid Services Organization (NLASO) — District Legal Aid Office (DLAO)'}
              </span>
              <h1 className="gov-system-title">
                {language === 'bn'
                  ? 'সমন্বিত ডিজিটাল লিগ্যাল এইড সেবা প্ল্যাটফর্ম (ADLASB)'
                  : 'Integrated Digital Legal Aid Services Platform (ADLASB)'}
              </h1>
            </div>
          </div>

          {/* Quick Emergency Assistance Block */}
          <div className="masthead-emergency">
            <div className="emergency-item primary-help">
              <div className="em-icon">📞</div>
              <div className="em-info">
                <span className="em-num">১৬৬৯৯</span>
                <span className="em-lbl">{language === 'bn' ? 'জাতীয় লিগ্যাল এইড' : 'Legal Aid Helpline'}</span>
              </div>
            </div>
            <div className="emergency-item police-help">
              <div className="em-icon">🚨</div>
              <div className="em-info">
                <span className="em-num">৯৯৯</span>
                <span className="em-lbl">{language === 'bn' ? 'জরুরি সেবা' : 'Emergency 999'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TIER 3: Institutional Menu Bar (Solid Green #0F5132 + Navigation + Roles)
          ========================================================================= */}
      <nav className="gov-menubar" aria-label="Portal Navigation">
        <div className="menubar-inner">
          <div className="menubar-tabs">
            {/* Citizen Portal */}
            <button
              type="button"
              className={`gov-nav-tab ${currentView === 'citizen-portal' ? 'active' : ''}`}
              onClick={() => setCurrentView('citizen-portal')}
            >
              {language === 'bn' ? 'নাগরিক পোর্টাল' : 'Citizen Portal'}
            </button>

            {/* DLAO Staff Registry */}
            <button
              type="button"
              className={`gov-nav-tab ${currentView === 'cases' || currentView === 'case-detail' || currentView === 'new-app' ? 'active' : ''}`}
              onClick={() => setCurrentView('cases')}
            >
              {language === 'bn' ? 'ডিএলএও কর্মকর্তা রেজিস্ট্রি' : 'DLAO Staff Registry'}
            </button>

            {/* Representative Portal (Ripon) */}
            <button
              type="button"
              className={`gov-nav-tab ${currentView === 'representative-portal' ? 'active' : ''}`}
              onClick={() => {
                setRole('AUTHORIZED_REPRESENTATIVE');
                setCurrentView('representative-portal');
              }}
            >
              {language === 'bn' ? 'প্রতিনিধি পোর্টাল (রিপন)' : 'Representative Portal (Ripon)'}
            </button>

            {/* UDC Assisted Portal (Nuching Marma) */}
            <button
              type="button"
              className={`gov-nav-tab ${currentView === 'udc-portal' ? 'active' : ''}`}
              onClick={() => {
                setRole('B4_UDC_ENTREPRENEUR');
                setCurrentView('udc-portal');
              }}
            >
              {language === 'bn' ? 'ইউডিসি সহায়তা (নূচিং মারমা)' : 'UDC Assisted Portal (Nuching)'}
            </button>

            {/* Citizen Intake */}
            <button
              type="button"
              className={`gov-nav-tab ${currentView === 'citizen-intake' ? 'active' : ''}`}
              onClick={() => setCurrentView('citizen-intake')}
            >
              {language === 'bn' ? '+ নতুন আবেদন গ্রহণ' : '+ New Citizen Intake'}
            </button>
          </div>

          {/* Role Switcher */}
          <div className="gov-role-selector">
            <label htmlFor="nav-role-select" className="role-selector-label">
              {language === 'bn' ? 'সেশন পদবী:' : 'Active Role:'}
            </label>
            <select
              id="nav-role-select"
              value={currentRoleId}
              onChange={handleRoleChange}
              className="gov-role-dropdown"
              aria-label={t('app.activeRole')}
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.code}] {language === 'bn' ? r.nameBn : r.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>
      </nav>
    </header>
  );
}
