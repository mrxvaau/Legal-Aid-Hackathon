import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './i18n';
import { RoleProvider, useRole } from './hooks/useRole';
import Navbar from './components/Navbar';
import CaseListPage from './pages/CaseListPage';
import CaseDetailPage from './pages/CaseDetailPage';
import NewApplicationPage from './pages/NewApplicationPage';
import CitizenPortalPage from './pages/CitizenPortalPage';
import RepresentativePortalPage from './pages/RepresentativePortalPage';
import CitizenIntakePage from './pages/CitizenIntakePage';
import UdcAssistedIntakePage from './pages/UdcAssistedIntakePage';
import api from './services/api';

function MainApp() {
  const { language, t } = useLanguage();
  const { activeRole } = useRole();
  const [currentView, setCurrentView] = useState('citizen-portal'); // default citizen friendly experience
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [citizenSearchId, setCitizenSearchId] = useState('APP-20260901-0001');
  const [backendHealth, setBackendHealth] = useState(null);

  // Check health on mount to verify backend communication
  useEffect(() => {
    api.getHealth()
      .then(res => setBackendHealth(res.status))
      .catch(() => setBackendHealth('DOWN'));
  }, []);

  const handleSelectCase = (caseId) => {
    setSelectedCaseId(caseId);
    setCurrentView('case-detail');
  };

  const handleBackToList = () => {
    setSelectedCaseId(null);
    setCurrentView('cases');
  };

  const handleCaseCreated = (caseId) => {
    setSelectedCaseId(caseId);
    setCurrentView('case-detail');
  };

  const handleCitizenCaseCreated = (caseId, applicationId) => {
    setCitizenSearchId(applicationId || caseId);
    setCurrentView('citizen-portal');
  };

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content Area */}
      <main className="main-content">
        {/* DLAO Administrative Case Registry */}
        {currentView === 'cases' && (
          <CaseListPage
            onSelectCase={handleSelectCase}
            onNewApplication={() => setCurrentView('new-app')}
          />
        )}

        {/* DLAO Administrative Case Dossier */}
        {currentView === 'case-detail' && selectedCaseId && (
          <CaseDetailPage
            caseId={selectedCaseId}
            onBack={handleBackToList}
          />
        )}

        {/* DLAO Administrative Intake */}
        {currentView === 'new-app' && (
          <NewApplicationPage
            onCaseCreated={handleCaseCreated}
            onCancel={handleBackToList}
          />
        )}

        {/* Dedicated Citizen Portal Experience */}
        {currentView === 'citizen-portal' && (
          <CitizenPortalPage
            initialSearchId={citizenSearchId}
            onStartIntake={() => setCurrentView('citizen-intake')}
            onViewCase={(caseId) => {
              setSelectedCaseId(caseId);
              setCurrentView('case-detail');
            }}
          />
        )}

        {/* Dedicated Representative Portal Experience (Ripon) */}
        {currentView === 'representative-portal' && (
          <RepresentativePortalPage
            onNavigateToCitizenPortal={() => {
              setCitizenSearchId('APP-20260901-0001');
              setCurrentView('citizen-portal');
            }}
            onViewFullDossier={(caseId) => {
              setSelectedCaseId(caseId);
              setCurrentView('case-detail');
            }}
          />
        )}

        {/* Dedicated UDC Assisted Offline-Capable Portal (Nuching Marma) */}
        {currentView === 'udc-portal' && (
          <UdcAssistedIntakePage
            onNavigateToCase={(caseId) => {
              setSelectedCaseId(caseId);
              setCurrentView('case-detail');
            }}
          />
        )}

        {/* Dedicated Citizen Mobile-First Intake Experience */}
        {currentView === 'citizen-intake' && (
          <CitizenIntakePage
            onCaseCreated={handleCitizenCaseCreated}
            onCancel={() => setCurrentView('citizen-portal')}
          />
        )}
      </main>

      {/* Footer System Status Ribbon */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="status-indicator">
            <span className={`status-dot ${backendHealth === 'UP' ? 'online' : 'offline'}`} />
            <span>
              Express REST API: <strong>{backendHealth === 'UP' ? 'CONNECTED (Port 5000)' : 'CHECKING / OFFLINE'}</strong>
            </span>
          </div>

          <div className="footer-meta">
            <span>Role: <strong>{activeRole.code} - {language === 'bn' ? activeRole.nameBn : activeRole.nameEn}</strong></span>
            <span>•</span>
            <span>Locale: <strong>{language === 'bn' ? 'বাংলা (BN)' : 'English (EN)'}</strong></span>
            <span>•</span>
            <span>Database: <strong>SQLite (via Backend Services)</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <RoleProvider>
        <MainApp />
      </RoleProvider>
    </LanguageProvider>
  );
}
