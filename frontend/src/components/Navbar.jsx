import React from 'react';
import { useLanguage } from '../i18n';
import { useRole } from '../hooks/useRole';

export default function Navbar({ currentView, setCurrentView }) {
  const { language, toggleLanguage, t } = useLanguage();
  const { activeRole, currentRoleId, setRole, AVAILABLE_ROLES } = useRole();

  const handleRoleChange = (e) => {
    const newRoleId = e.target.value;
    setRole(newRoleId);
    if (newRoleId === 'AUTHORIZED_REPRESENTATIVE') {
      setCurrentView('representative-portal');
    } else if (newRoleId === 'B4_UDC_ENTREPRENEUR') {
      setCurrentView('udc-portal');
    }
  };

  return (
    <header className="adlasb-navbar" role="banner">
      <div className="navbar-container">
        {/* Brand / Logo */}
        <div
          className="navbar-brand"
          onClick={() => setCurrentView('cases')}
          style={{ cursor: 'pointer' }}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCurrentView('cases'); }}
          aria-label={t('app.title')}
        >
          <div className="brand-logo-icon" aria-hidden="true">⚖️</div>
          <div>
            <h1 className="brand-title">{t('app.title')}</h1>
            <p className="brand-subtitle">{t('app.subtitle')}</p>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="navbar-controls">
          <nav className="nav-links" aria-label="Portal Navigation">
            {/* DLAO Staff Registry */}
            <button
              type="button"
              className={`nav-btn ${currentView === 'cases' || currentView === 'case-detail' || currentView === 'new-app' ? 'active' : ''}`}
              onClick={() => setCurrentView('cases')}
            >
              {t('portal.adminPortal')}
            </button>

            {/* Citizen Portal */}
            <button
              type="button"
              className={`nav-btn ${currentView === 'citizen-portal' ? 'active' : ''}`}
              onClick={() => setCurrentView('citizen-portal')}
            >
              {t('portal.citizenPortal')}
            </button>

            {/* Representative Portal (Ripon) */}
            <button
              type="button"
              className={`nav-btn ${currentView === 'representative-portal' ? 'active' : ''}`}
              onClick={() => {
                setRole('AUTHORIZED_REPRESENTATIVE');
                setCurrentView('representative-portal');
              }}
            >
              {t('portal.representativePortal')}
            </button>

            {/* UDC Assisted Portal (Nuching Marma) */}
            <button
              type="button"
              className={`nav-btn ${currentView === 'udc-portal' ? 'active' : ''}`}
              onClick={() => {
                setRole('B4_UDC_ENTREPRENEUR');
                setCurrentView('udc-portal');
              }}
            >
              {t('portal.udcPortal')}
            </button>

            {/* Citizen Intake */}
            <button
              type="button"
              className={`nav-btn ${currentView === 'citizen-intake' ? 'active' : ''}`}
              onClick={() => setCurrentView('citizen-intake')}
            >
              {t('portal.citizenIntake')}
            </button>
          </nav>

          {/* Role Switcher */}
          <div className="role-switcher">
            <label htmlFor="role-select" className="role-label">
              👤 {t('app.activeRole')}:
            </label>
            <select
              id="role-select"
              value={currentRoleId}
              onChange={handleRoleChange}
              className="role-dropdown"
              aria-label={t('app.activeRole')}
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.code}] {language === 'bn' ? r.nameBn : r.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Language Toggle */}
          <button
            type="button"
            className="lang-toggle-btn"
            onClick={toggleLanguage}
            title={language === 'en' ? 'Switch to Bangla' : 'Switch to English'}
            aria-label={language === 'en' ? 'Switch interface language to Bangla' : 'Switch interface language to English'}
          >
            🌐 <span style={{ fontWeight: '700' }}>{t('app.switchLanguage')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
