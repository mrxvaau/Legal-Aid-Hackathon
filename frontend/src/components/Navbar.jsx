import React from 'react';
import { useLanguage } from '../i18n';
import { useRole } from '../hooks/useRole';

export default function Navbar({ currentView, setCurrentView }) {
  const { language, toggleLanguage, t } = useLanguage();
  const { activeRole, currentRoleId, setRole, AVAILABLE_ROLES } = useRole();

  return (
    <header className="adlasb-navbar">
      <div className="navbar-container">
        {/* Brand / Logo */}
        <div className="navbar-brand" onClick={() => setCurrentView('cases')} style={{ cursor: 'pointer' }}>
          <div className="brand-logo-icon">⚖️</div>
          <div>
            <h1 className="brand-title">{t('app.title')}</h1>
            <p className="brand-subtitle">{t('app.subtitle')}</p>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="navbar-controls">
          <nav className="nav-links">
            <button
              className={`nav-btn ${currentView === 'cases' ? 'active' : ''}`}
              onClick={() => setCurrentView('cases')}
            >
              📑 {t('app.cases')}
            </button>
            <button
              className={`nav-btn ${currentView === 'new-app' ? 'active' : ''}`}
              onClick={() => setCurrentView('new-app')}
            >
              ➕ {t('app.newApplication')}
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
              onChange={(e) => setRole(e.target.value)}
              className="role-dropdown"
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
            className="lang-toggle-btn"
            onClick={toggleLanguage}
            title={language === 'en' ? 'Switch to Bangla' : 'Switch to English'}
          >
            🌐 <span style={{ fontWeight: '700' }}>{t('app.switchLanguage')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
