import React from 'react';
import { useLanguage } from '../i18n';
import { IconCitizen, IconOfficer, IconLawyer, IconLogin, IconRegister, IconPhone, IconShield } from '../components/Icons';

export default function LandingPage({ onNavigateLogin, onNavigateRegister, onQuickDemo }) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <div className="landing-container">
      {/* =========================================================================
          HERO SECTION (Institutional Green Masthead + National Emblem)
          ========================================================================= */}
      <section className="landing-hero" aria-label="Hero Section">
        <div className="landing-hero-backdrop"></div>
        <div className="landing-hero-content">
          <div className="landing-hero-top-badge">
            <span className="gov-republic-text">
              {language === 'bn'
                ? 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার | আইন ও বিচার বিভাগ'
                : "Government of the People's Republic of Bangladesh | Law and Justice Division"}
            </span>
            <span className="gov-agency-text">
              {language === 'bn'
                ? 'জাতীয় আইনগত সহায়তা প্রদান সংস্থা (NLASO)'
                : 'National Legal Aid Services Organization (NLASO)'}
            </span>
          </div>

          <div className="landing-hero-titles">
            <div className="landing-emblem-wrap" aria-hidden="true">
              <span className="landing-emblem">⚖️</span>
            </div>
            <h1 className="landing-main-title">
              {language === 'bn' ? 'ডিজিটাল লিগ্যাল এইড সেবা' : 'Digital Legal Aid System'}
            </h1>
            <p className="landing-subtitle">
              DLAS — Five Doors, One Record
            </p>
            <div className="landing-mission-statement">
              <span className="mission-bn">
                {language === 'bn' 
                  ? 'একটি অ্যাপ্লিকেশন আইডি, একটি কেস আইডি, একটি ন্যায়বিচার।'
                  : 'One Application ID. One Case ID. One Justice.'}
              </span>
              <span className="mission-sub">
                {language === 'bn'
                  ? 'পাঁচটি প্রবেশদ্বার, একটি সমন্বিত কেন্দ্রীয় রেকর্ড — ন্যায়বিচার নিশ্চিত করার অঙ্গীকার'
                  : 'Five Entry Doors, One Integrated Central Dossier — Guaranteed Access to Justice'}
              </span>
            </div>
          </div>

          <div className="landing-hero-stats">
            <div className="hero-stat-chip">
              <span className="stat-dot"></span>
              <span>{language === 'bn' ? '৬৪ জেলায় ডিএলএও অফিস' : '64 District DLAO Offices'}</span>
            </div>
            <div className="hero-stat-chip">
              <span className="stat-dot"></span>
              <span>{language === 'bn' ? 'টোল-ফ্রি হেল্পলাইন ১৬৬৯৯' : 'Toll-Free Helpline 16699'}</span>
            </div>
            <div className="hero-stat-chip">
              <span className="stat-dot"></span>
              <span>{language === 'bn' ? '৪,৫০০+ ইউডিসি সহায়তা কেন্দ্র' : '4,500+ UDC Assistance Centers'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PART 1 CORE: THREE ENTRY CARDS (Citizen, Service Officer, Panel Lawyer)
          ========================================================================= */}
      <section className="landing-portals-section" aria-label="Portal Entry Cards">
        <div className="landing-section-header">
          <h2 className="section-title">
            {language === 'bn' ? 'সেবায় প্রবেশ করুন' : 'Choose Your Service Door'}
          </h2>
          <p className="section-desc">
            {language === 'bn'
              ? 'আপনার ভূমিকা অনুযায়ী সঠিক পোর্টাল নির্বাচন করুন এবং প্রবেশ অথবা নতুন নিবন্ধন করুন'
              : 'Select your role below to log in to your dedicated portal or register for a new account'}
          </p>
        </div>

        <div className="portal-cards-grid">
          {/* 1. CITIZEN CARD */}
          <div className="portal-card portal-card-citizen" id="card-citizen">
            <div className="card-top-accent citizen-accent"></div>
            <div className="card-body">
              <div className="portal-icon-wrapper citizen-icon-wrapper">
                <IconCitizen size={36} className="portal-svg-icon" />
              </div>

              <div className="portal-header-info">
                <div className="portal-category-tag">
                  {language === 'bn' ? 'নাগরিক সেবা' : 'Citizen Service'}
                </div>
                <h3 className="portal-title">
                  {language === 'bn' ? 'নাগরিক / Citizen' : 'Citizen / নাগরিক'}
                </h3>
                <p className="portal-desc">
                  {language === 'bn'
                    ? 'আইনি সহায়তার জন্য আবেদন করুন বা আপনার কেসের অবস্থা দেখুন'
                    : 'Apply for legal aid or check your case status'}
                </p>
              </div>

              <div className="portal-features-list">
                <div className="feature-item">
                  <span className="feature-check">✓</span>
                  <span>{language === 'bn' ? 'নতুন আইনি সহায়তার আবেদন' : 'Online & walk-in legal aid application'}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-check">✓</span>
                  <span>{language === 'bn' ? 'টোকেন/আইডি দিয়ে তাৎক্ষণিক ট্র্যাকিং' : 'Real-time case & milestone tracking'}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-check">✓</span>
                  <span>{language === 'bn' ? 'অনুমোদিত প্রতিনিধি সমর্থন' : 'Authorized representative access'}</span>
                </div>
              </div>

              <div className="portal-actions">
                <button
                  type="button"
                  id="btn-login-citizen"
                  className="btn-portal-primary"
                  onClick={() => onNavigateLogin('citizen')}
                >
                  <IconLogin size={18} />
                  <span>{language === 'bn' ? 'প্রবেশ করুন' : 'Login'}</span>
                </button>
                <button
                  type="button"
                  id="btn-register-citizen"
                  className="btn-portal-secondary"
                  onClick={() => onNavigateRegister('citizen')}
                >
                  <IconRegister size={18} />
                  <span>{language === 'bn' ? 'নিবন্ধন করুন' : 'Register'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. SERVICE OFFICER CARD */}
          <div className="portal-card portal-card-officer" id="card-officer">
            <div className="card-top-accent officer-accent"></div>
            <div className="card-body">
              <div className="portal-icon-wrapper officer-icon-wrapper">
                <IconOfficer size={36} className="portal-svg-icon" />
              </div>

              <div className="portal-header-info">
                <div className="portal-category-tag">
                  {language === 'bn' ? 'কর্মকর্তা ও প্রশাসন' : 'Officer & Administration'}
                </div>
                <h3 className="portal-title">
                  {language === 'bn' ? 'সেবা কর্মকর্তা / Service Officer' : 'Service Officer / সেবা কর্মকর্তা'}
                </h3>
                <p className="portal-desc">
                  {language === 'bn'
                    ? 'DLAO কর্মকর্তা, মধ্যস্থতাকারী, হেল্পলাইন এজেন্ট, ইউডিসি এবং প্রশাসনিক কর্মী'
                    : 'DLAO officers, mediators, helpline agents, UDC staff, and admin staff'}
                </p>
              </div>

              <div className="portal-features-list">
                <div className="feature-item">
                  <span className="feature-check">✓</span>
                  <span>{language === 'bn' ? 'কেস ডসিয়ার ও টাইমলাইন পরিচালনা' : 'Comprehensive case dossier & lifecycle'}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-check">✓</span>
                  <span>{language === 'bn' ? 'এডিআর/মধ্যস্থতা ও আপস ড্রাফটিং' : 'ADR settlement drafting & mediation'}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-check">✓</span>
                  <span>{language === 'bn' ? 'আইনজীবী নিয়োগ ও পর্যবেক্ষণ' : 'Lawyer assignment & performance tracking'}</span>
                </div>
              </div>

              <div className="portal-actions">
                <button
                  type="button"
                  id="btn-login-officer"
                  className="btn-portal-primary"
                  onClick={() => onNavigateLogin('officer')}
                >
                  <IconLogin size={18} />
                  <span>{language === 'bn' ? 'প্রবেশ করুন' : 'Login'}</span>
                </button>
                <button
                  type="button"
                  id="btn-register-officer"
                  className="btn-portal-secondary"
                  onClick={() => onNavigateRegister('officer')}
                >
                  <IconRegister size={18} />
                  <span>{language === 'bn' ? 'নিবন্ধন করুন' : 'Register'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. PANEL LAWYER CARD */}
          <div className="portal-card portal-card-lawyer" id="card-lawyer">
            <div className="card-top-accent lawyer-accent"></div>
            <div className="card-body">
              <div className="portal-icon-wrapper lawyer-icon-wrapper">
                <IconLawyer size={36} className="portal-svg-icon" />
              </div>

              <div className="portal-header-info">
                <div className="portal-category-tag">
                  {language === 'bn' ? 'প্যানেল আইনজীবী' : 'Panel Lawyer'}
                </div>
                <h3 className="portal-title">
                  {language === 'bn' ? 'প্যানেল আইনজীবী / Panel Lawyer' : 'Panel Lawyer / প্যানেল আইনজীবী'}
                </h3>
                <p className="portal-desc">
                  {language === 'bn'
                    ? 'আপনার নিযুক্ত মামলা পরিচালনা করুন'
                    : 'Manage your assigned cases'}
                </p>
              </div>

              <div className="portal-features-list">
                <div className="feature-item">
                  <span className="feature-check">✓</span>
                  <span>{language === 'bn' ? 'নিযুক্ত মামলার নথিপত্র পর্যালোচনা' : 'View assigned cases and legal briefs'}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-check">✓</span>
                  <span>{language === 'bn' ? 'আদালতের শুনানির তারিখ ও আপডেট' : 'Log court appearances & milestone reports'}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-check">✓</span>
                  <span>{language === 'bn' ? 'নিরাপদ প্রমাণপত্র ও নথি অ্যাক্সেস' : 'Encrypted evidence vault access'}</span>
                </div>
              </div>

              <div className="portal-actions">
                <button
                  type="button"
                  id="btn-login-lawyer"
                  className="btn-portal-primary"
                  onClick={() => onNavigateLogin('lawyer')}
                >
                  <IconLogin size={18} />
                  <span>{language === 'bn' ? 'প্রবেশ করুন' : 'Login'}</span>
                </button>
                <button
                  type="button"
                  id="btn-register-lawyer"
                  className="btn-portal-secondary"
                  onClick={() => onNavigateRegister('lawyer')}
                >
                  <IconRegister size={18} />
                  <span>{language === 'bn' ? 'নিবন্ধন করুন' : 'Register'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FIVE DOORS ARCHITECTURAL HIGHLIGHT STRIP
          ========================================================================= */}
      <section className="landing-doors-architecture" aria-label="Five Doors Architecture">
        <div className="doors-inner">
          <div className="doors-badge">
            <span>5 DOORS — 1 RECORD</span>
          </div>
          <h3 className="doors-heading">
            {language === 'bn'
              ? 'ন্যায়বিচারে অভিগম্যতার ৫টি সমন্বিত প্রবেশদ্বার'
              : 'Five Integrated Pathways to Legal Aid Justice'}
          </h3>
          <div className="doors-grid">
            <div className="door-step">
              <span className="door-num">১</span>
              <h4>{language === 'bn' ? 'নাগরিক সেবা ও ওয়াক-ইন' : 'Citizen Direct & Walk-in'}</h4>
              <p>{language === 'bn' ? 'অনলাইন পোর্টাল বা সরাসরি ডিএলএও অফিসে আগমন' : 'Direct web portal or walk-in to district office'}</p>
            </div>
            <div className="door-step">
              <span className="door-num">২</span>
              <h4>{language === 'bn' ? '১৬৬৯৯ জাতীয় হেল্পলাইন' : '16699 National Helpline'}</h4>
              <p>{language === 'bn' ? 'টোল-ফ্রি ফোনে মৌখিক পরামর্শ ও কেস খোলা' : 'Toll-free voice consultation and intake'}</p>
            </div>
            <div className="door-step">
              <span className="door-num">৩</span>
              <h4>{language === 'bn' ? 'ইউনিয়ন ডিজিটাল সেন্টার' : 'Union Digital Center (UDC)'}</h4>
              <p>{language === 'bn' ? 'তৃণমূল পর্যায়ে উদ্যোক্তা সহায়তা ও অফলাইন সিঙ্ক' : 'Grassroots rural intake with offline sync'}</p>
            </div>
            <div className="door-step">
              <span className="door-num">৪</span>
              <h4>{language === 'bn' ? 'বিকল্প বিরোধ নিষ্পত্তি (ADR)' : 'Alternative Dispute Resolution'}</h4>
              <p>{language === 'bn' ? 'মধ্যস্থতা ও প্রি-ট্রায়াল আইনি সমঝোতা' : 'DLAO formal mediation and settlement drafts'}</p>
            </div>
            <div className="door-step">
              <span className="door-num">৫</span>
              <h4>{language === 'bn' ? 'প্যানেল আইনজীবী প্রতিরক্ষা' : 'Panel Legal Defense'}</h4>
              <p>{language === 'bn' ? 'যোগ্য নাগরিকের পক্ষে আদালতে নিখরচায় মামলা পরিচালনা' : 'Free courtroom representation by appointed bar advocates'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          JURY EVALUATION SHORTCUT BANNER
          ========================================================================= */}
      <section className="landing-evaluation-shortcut" aria-label="Jury Evaluation Banner">
        <div className="evaluation-card">
          <div className="eval-icon">🏛️</div>
          <div className="eval-info">
            <h4>
              {language === 'bn'
                ? 'বিচারক ও মূল্যায়নকারী দলের জন্য দ্রুত পরিদর্শন'
                : 'Jury & Evaluation Quick Access'}
            </h4>
            <p>
              {language === 'bn'
                ? 'সরাসরি টেস্ট ডেটা ও ডেমো রোল পরীক্ষা করতে চান? যেকোন পোর্টাল লগইনে ডেমো ড্রপডাউন ব্যবহার করুন অথবা নিচের বোতামে চাপুন।'
                : 'Want to immediately inspect all test scenarios and seeded roles? Use the demo dropdown on any login screen or click below.'}
            </p>
          </div>
          <div className="eval-actions">
            <button
              type="button"
              className="btn-demo-quick-open"
              onClick={() => onNavigateLogin('officer')}
            >
              <span>{language === 'bn' ? 'অফিসার পোর্টাল ডেমো' : 'Officer Demo'}</span>
            </button>
            <button
              type="button"
              className="btn-demo-quick-open"
              onClick={() => onNavigateLogin('citizen')}
            >
              <span>{language === 'bn' ? 'নাগরিক পোর্টাল ডেমো' : 'Citizen Demo'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INSTITUTIONAL FOOTER WITH HELPLINE & LANGUAGE TOGGLE
          ========================================================================= */}
      <footer className="landing-gov-footer" role="contentinfo">
        <div className="landing-footer-inner">
          <div className="footer-col-brand">
            <div className="footer-emblem-row">
              <span className="emblem-char">⚖️</span>
              <span className="footer-title">ADLASB National Legal Aid</span>
            </div>
            <p className="footer-tagline">
              {language === 'bn'
                ? 'আইন ও বিচার বিভাগ, গণপ্রজাতন্ত্রী বাংলাদেশ সরকার কর্তৃক পরিচালিত ডিজিটাল লিগ্যাল এইড প্ল্যাটফর্ম।'
                : 'Digital Legal Aid Services Platform operated under the Law and Justice Division, Government of Bangladesh.'}
            </p>
          </div>

          <div className="footer-col-help">
            <h4 className="footer-heading">{language === 'bn' ? 'জরুরি সহায়তা' : 'Emergency Assistance'}</h4>
            <div className="footer-helpline-box">
              <div className="helpline-num-row">
                <IconPhone size={20} className="helpline-icon" />
                <span className="helpline-big-number">১৬৬৯৯</span>
              </div>
              <span className="helpline-desc">
                {language === 'bn'
                  ? 'টোল-ফ্রি জাতীয় লিগ্যাল এইড হেল্পলাইন (সকাল ৯টা - বিকাল ৫টা)'
                  : 'Toll-free National Legal Aid Helpline (9 AM - 5 PM)'}
              </span>
            </div>
          </div>

          <div className="footer-col-lang">
            <h4 className="footer-heading">{language === 'bn' ? 'ভাষা ও প্রবেশাধিকার' : 'Language & Accessibility'}</h4>
            <div className="footer-lang-controls">
              <button
                type="button"
                className="footer-lang-btn"
                onClick={toggleLanguage}
                aria-label="Toggle language"
              >
                🌐 <span className="lang-name">{language === 'bn' ? 'English Language' : 'বাংলা সংস্করণ'}</span>
              </button>
              <p className="footer-security-note">
                <IconShield size={16} />
                <span>{language === 'bn' ? 'সরকারি ডেটা নিরাপত্তা মানসম্মত' : 'Gov-Grade Data Privacy Compliant'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <p>© 2026 {language === 'bn' ? 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার | সর্বস্বত্ব সংরক্ষিত' : "Government of the People's Republic of Bangladesh | All Rights Reserved"}</p>
        </div>
      </footer>
    </div>
  );
}
