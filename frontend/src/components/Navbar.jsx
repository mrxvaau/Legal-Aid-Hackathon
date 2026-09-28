import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import { useRole } from '../hooks/useRole';
import AccessibilityToolbar from './AccessibilityToolbar';
import { IconLogout, IconLogin, IconRegister } from './Icons';

export default function Navbar({ currentView, setCurrentView, onNavigateLogin, onNavigateRegister }) {
  const { language, toggleLanguage, t } = useLanguage();
  const { currentUser, isAuthenticated, logout, activeRole, currentRoleId } = useRole();
  const [a11yOpen, setA11yOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setCurrentView('landing');
  };

  const handleBrandClick = () => {
    if (!currentUser) {
      setCurrentView('landing');
    } else if (currentRoleId === 'AUTHORIZED_REPRESENTATIVE') {
      setCurrentView('representative-portal');
    } else if (currentRoleId === 'B4_UDC_ENTREPRENEUR') {
      setCurrentView('udc-portal');
    } else if (currentRoleId === 'CITIZEN_APPLICANT') {
      setCurrentView('citizen-portal');
    } else {
      setCurrentView('cases');
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
            onClick={handleBrandClick}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBrandClick(); }}
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
          TIER 3: Institutional Menu Bar (Solid Green #0F5132 + Navigation + User Session / Logout)
          ========================================================================= */}
      <nav className="gov-menubar" aria-label="Portal Navigation">
        <div className="menubar-inner">
          <div className="menubar-tabs">
            {/* If NOT authenticated (e.g. Landing / Login / Register) */}
            {!currentUser && (
              <>
                <button
                  type="button"
                  className={`gov-nav-tab ${currentView === 'landing' ? 'active' : ''}`}
                  onClick={() => setCurrentView('landing')}
                >
                  {language === 'bn' ? 'মূল পাতা (হোম)' : 'Home / Landing'}
                </button>
                <button
                  type="button"
                  className={`gov-nav-tab ${currentView === 'login' ? 'active' : ''}`}
                  onClick={() => setCurrentView('login')}
                >
                  {language === 'bn' ? 'লগইন করুন' : 'Sign In'}
                </button>
                <button
                  type="button"
                  className={`gov-nav-tab ${currentView === 'register' ? 'active' : ''}`}
                  onClick={() => setCurrentView('register')}
                >
                  {language === 'bn' ? 'নতুন নিবন্ধন' : 'Register'}
                </button>
              </>
            )}

            {/* If AUTHENTICATED: Show Role-Specific Tabs */}
            {currentUser && (
              <>
                {/* 1. Citizen Applicant Portal */}
                {currentRoleId === 'CITIZEN_APPLICANT' && (
                  <>
                    <button
                      type="button"
                      className={`gov-nav-tab ${currentView === 'citizen-portal' ? 'active' : ''}`}
                      onClick={() => setCurrentView('citizen-portal')}
                    >
                      {language === 'bn' ? 'নাগরিক পোর্টাল' : 'Citizen Portal'}
                    </button>
                    <button
                      type="button"
                      className={`gov-nav-tab ${currentView === 'citizen-intake' ? 'active' : ''}`}
                      onClick={() => setCurrentView('citizen-intake')}
                    >
                      {language === 'bn' ? '+ নতুন আবেদন গ্রহণ' : '+ New Citizen Intake'}
                    </button>
                  </>
                )}

                {/* 2. Authorized Representative Portal */}
                {currentRoleId === 'AUTHORIZED_REPRESENTATIVE' && (
                  <>
                    <button
                      type="button"
                      className={`gov-nav-tab ${currentView === 'representative-portal' ? 'active' : ''}`}
                      onClick={() => setCurrentView('representative-portal')}
                    >
                      {language === 'bn' ? 'প্রতিনিধি পোর্টাল' : 'Representative Portal'}
                    </button>
                    <button
                      type="button"
                      className={`gov-nav-tab ${currentView === 'citizen-portal' ? 'active' : ''}`}
                      onClick={() => setCurrentView('citizen-portal')}
                    >
                      {language === 'bn' ? 'কেস ট্র্যাকিং' : 'Case Tracking'}
                    </button>
                  </>
                )}

                {/* 3. UDC Assisted Portal */}
                {currentRoleId === 'B4_UDC_ENTREPRENEUR' && (
                  <>
                    <button
                      type="button"
                      className={`gov-nav-tab ${currentView === 'udc-portal' ? 'active' : ''}`}
                      onClick={() => setCurrentView('udc-portal')}
                    >
                      {language === 'bn' ? 'ইউডিসি সহায়তা পোর্টাল' : 'UDC Assisted Portal'}
                    </button>
                    <button
                      type="button"
                      className={`gov-nav-tab ${currentView === 'cases' ? 'active' : ''}`}
                      onClick={() => setCurrentView('cases')}
                    >
                      {language === 'bn' ? 'ডিএলএও রেজিস্ট্রি' : 'DLAO Registry'}
                    </button>
                  </>
                )}

                {/* 4. Panel Lawyer Portal */}
                {currentRoleId === 'B5_PANEL_LAWYER' && (
                  <>
                    <button
                      type="button"
                      className={`gov-nav-tab ${currentView === 'cases' ? 'active' : ''}`}
                      onClick={() => setCurrentView('cases')}
                    >
                      {language === 'bn' ? 'নিযুক্ত মামলা রেজিস্ট্রি' : 'Assigned Case Dossier'}
                    </button>
                  </>
                )}

                {/* 5. DLAO Officers, Mediators, Helpline, and Admins */}
                {['B1_DLAO_OFFICER', 'B2_LEGAL_AID_OFFICER', 'B3_HELPLINE_AGENT', 'B6_RECEIVING_DLAO', 'B7_DLAO_ADMIN'].includes(currentRoleId) && (
                  <>
                    <button
                      type="button"
                      className={`gov-nav-tab ${currentView === 'cases' || currentView === 'case-detail' ? 'active' : ''}`}
                      onClick={() => setCurrentView('cases')}
                    >
                      {language === 'bn' ? 'ডিএলএও কর্মকর্তা রেজিস্ট্রি' : 'DLAO Staff Registry'}
                    </button>
                    <button
                      type="button"
                      className={`gov-nav-tab ${currentView === 'new-app' ? 'active' : ''}`}
                      onClick={() => setCurrentView('new-app')}
                    >
                      {language === 'bn' ? '+ প্রশাসনিক আবেদন' : '+ New Application'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* =========================================================================
              PART 4: REPLACED ROLE SWITCHER DROPDOWN
              Shows logged-in identity badge + persistent "Logout" button
              or "Sign In / Register" shortcuts when unauthenticated
              ========================================================================= */}
          <div className="gov-auth-session-area">
            {currentUser ? (
              <div className="session-user-container">
                <div className="session-user-badge">
                  <span className="session-role-code">[{activeRole.code}]</span>
                  <span className="session-user-name">
                    {language === 'bn' ? (currentUser.nameBn || currentUser.name) : currentUser.name}
                  </span>
                  <span className="session-office-label">
                    {currentUser.office || 'DLAO Dhaka'}
                  </span>
                </div>
                <button
                  type="button"
                  id="nav-logout-btn"
                  className="btn-nav-logout"
                  onClick={handleLogout}
                  title={language === 'bn' ? 'লগআউট করে মূল পাতায় ফিরুন' : 'Logout and return to Landing Page'}
                >
                  <IconLogout size={16} />
                  <span>{language === 'bn' ? 'লগআউট' : 'Logout'}</span>
                </button>
              </div>
            ) : (
              <div className="unauth-actions">
                <button
                  type="button"
                  id="nav-login-btn"
                  className="btn-menubar-login"
                  onClick={() => onNavigateLogin?.('citizen')}
                >
                  <IconLogin size={15} />
                  <span>{language === 'bn' ? 'প্রবেশ করুন' : 'Sign In'}</span>
                </button>
                <button
                  type="button"
                  id="nav-register-btn"
                  className="btn-menubar-register"
                  onClick={() => onNavigateRegister?.('citizen')}
                >
                  <IconRegister size={15} />
                  <span>{language === 'bn' ? 'নিবন্ধন' : 'Register'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
