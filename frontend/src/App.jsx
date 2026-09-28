import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './i18n';
import { RoleProvider, useRole } from './hooks/useRole';
import Navbar from './components/Navbar';
import StatStrip from './components/StatStrip';
import GovFooter from './components/GovFooter';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CaseListPage from './pages/CaseListPage';
import CaseDetailPage from './pages/CaseDetailPage';
import NewApplicationPage from './pages/NewApplicationPage';
import CitizenPortalPage from './pages/CitizenPortalPage';
import RepresentativePortalPage from './pages/RepresentativePortalPage';
import CitizenIntakePage from './pages/CitizenIntakePage';
import UdcAssistedIntakePage from './pages/UdcAssistedIntakePage';
import EmergencyAlertButton from './components/EmergencyAlertButton';
import api from './services/api';

function MainApp() {
  const { language, t } = useLanguage();
  const { currentUser, isAuthenticated, currentRoleId } = useRole();

  // App starts at Landing Page as true institutional entry point
  const [currentView, setCurrentView] = useState(() => {
    // If user was previously logged in, resume to their portal, else start at landing
    const storedUser = localStorage.getItem('adlasb_current_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.roleId === 'AUTHORIZED_REPRESENTATIVE') return 'representative-portal';
        if (u.roleId === 'B4_UDC_ENTREPRENEUR') return 'udc-portal';
        if (u.roleId === 'CITIZEN_APPLICANT') return 'citizen-portal';
        return 'cases';
      } catch (e) {}
    }
    return 'landing';
  });

  const [authRole, setAuthRole] = useState('citizen'); // 'citizen' | 'officer' | 'lawyer'
  const [prefilledIdentifier, setPrefilledIdentifier] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [citizenSearchId, setCitizenSearchId] = useState('APP-20260901-0001');
  const [backendHealth, setBackendHealth] = useState(null);

  // Check health on mount to verify backend communication
  useEffect(() => {
    api.getHealth()
      .then(res => setBackendHealth(res.status))
      .catch(() => setBackendHealth('DOWN'));
  }, []);

  // Handlers for Landing navigation
  const handleNavigateLogin = (role = 'citizen', identifier = '') => {
    setAuthRole(role);
    setPrefilledIdentifier(identifier);
    setCurrentView('login');
  };

  const handleNavigateRegister = (role = 'citizen') => {
    setAuthRole(role);
    setCurrentView('register');
  };

  const handleLoginSuccess = (targetPortal, roleId) => {
    setSelectedCaseId(null);
    setCurrentView(targetPortal);
  };

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

  const isLandingView = currentView === 'landing';
  const isAuthView = currentView === 'login' || currentView === 'register';

  return (
    <div className="app-layout">
      {/* Top 3-Tier Navigation with persistent Logout & Session Status */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onNavigateLogin={handleNavigateLogin}
        onNavigateRegister={handleNavigateRegister}
      />

      {/* Show National Scale Stat Strip on Portals */}
      {!isLandingView && !isAuthView && <StatStrip />}

      {/* Main Content Area */}
      <main id="main-content" className={`main-content ${isLandingView ? 'landing-main' : ''}`}>
        {/* =========================================================================
            PART 1: INSTITUTIONAL LANDING PAGE
            ========================================================================= */}
        {currentView === 'landing' && (
          <LandingPage
            onNavigateLogin={handleNavigateLogin}
            onNavigateRegister={handleNavigateRegister}
          />
        )}

        {/* =========================================================================
            PART 2: REGISTER FLOW (per role type)
            ========================================================================= */}
        {currentView === 'register' && (
          <RegisterPage
            initialRole={authRole}
            onNavigateLogin={handleNavigateLogin}
            onBackToLanding={() => setCurrentView('landing')}
          />
        )}

        {/* =========================================================================
            PART 3: LOGIN FLOW (per role type with jury demo shortcut)
            ========================================================================= */}
        {currentView === 'login' && (
          <LoginPage
            initialRole={authRole}
            prefilledIdentifier={prefilledIdentifier}
            onLoginSuccess={handleLoginSuccess}
            onNavigateRegister={handleNavigateRegister}
            onBackToLanding={() => setCurrentView('landing')}
          />
        )}

        {/* =========================================================================
            PART 4: DEDICATED ROLE PORTALS
            ========================================================================= */}

        {/* 1. DLAO Administrative Case Registry (B1, B2, B3, B5 Lawyer, B6, B7) */}
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

        {/* 2. Dedicated Citizen Portal Experience */}
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

        {/* 3. Dedicated Representative Portal Experience (Ripon) */}
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

        {/* 4. Dedicated UDC Assisted Offline-Capable Portal (Nuching Marma / Minu) */}
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

      {/* Persistent Emergency / Danger Alert Button on all citizen-facing views */}
      {(currentView === 'citizen-portal' || currentView === 'citizen-intake' || currentView === 'representative-portal') && (
        <EmergencyAlertButton currentView={currentView} />
      )}

      {/* Restrained Official Footer on portals and auth views */}
      {!isLandingView && <GovFooter backendHealth={backendHealth} />}
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
