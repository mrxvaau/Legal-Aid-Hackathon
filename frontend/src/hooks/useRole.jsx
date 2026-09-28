import React, { createContext, useContext, useState, useEffect } from 'react';

const RoleContext = createContext();

export const AVAILABLE_ROLES = [
  { id: 'B1_DLAO_OFFICER', code: 'B1', nameEn: 'DLAO Officer', nameBn: 'ডিএলএও কর্মকর্তা', userId: 'PER-OFFICER-B1' },
  { id: 'B2_LEGAL_AID_OFFICER', code: 'B2', nameEn: 'Legal Aid Officer / Mediator', nameBn: 'লিগ্যাল এইড অফিসার / মধ্যস্থতাকারী', userId: 'PER-MEDIATOR-B2' },
  { id: 'B3_HELPLINE_AGENT', code: 'B3', nameEn: '16699 Helpline Agent', nameBn: '১৬৬৯৯ হেল্পলাইন এজেন্ট', userId: 'PER-HELPLINE-B3' },
  { id: 'B4_UDC_ENTREPRENEUR', code: 'B4', nameEn: 'UDC Entrepreneur', nameBn: 'ইউডিসি উদ্যোক্তা', userId: 'PER-UDC-B4' },
  { id: 'B5_PANEL_LAWYER', code: 'B5', nameEn: 'Panel Lawyer', nameBn: 'প্যানেল আইনজীবী', userId: 'PER-LAWYER-B5' },
  { id: 'B6_RECEIVING_DLAO', code: 'B6', nameEn: 'Receiving DLAO', nameBn: 'প্রাপক ডিএলএও', userId: 'PER-RECEIVING-B6' },
  { id: 'B7_DLAO_ADMIN', code: 'B7', nameEn: 'DLAO Admin / Support Staff', nameBn: 'ডিএলএও অ্যাডমিন / সহকারী কর্মকর্তা', userId: 'PER-ADMIN-B7' },
  { id: 'CITIZEN_APPLICANT', code: 'C1', nameEn: 'Citizen Applicant', nameBn: 'নাগরিক আবেদনকারী', userId: 'PER-CITIZEN-MOYURI' },
  { id: 'AUTHORIZED_REPRESENTATIVE', code: 'C2', nameEn: 'Authorized Representative', nameBn: 'অনুমোদিত প্রতিনিধি', userId: 'PER-CITIZEN-RIPON' }
];

export function RoleProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('adlasb_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const [currentRoleId, setCurrentRoleId] = useState(() => {
    return localStorage.getItem('adlasb_active_role') || 'B1_DLAO_OFFICER';
  });

  const activeRole = AVAILABLE_ROLES.find(r => r.id === currentRoleId) || AVAILABLE_ROLES[0];

  useEffect(() => {
    if (currentRoleId) {
      localStorage.setItem('adlasb_active_role', currentRoleId);
    }
  }, [currentRoleId]);

  const login = (person, roleId) => {
    const resolvedRoleId = roleId || person.role_id || 'CITIZEN_APPLICANT';
    const userObj = {
      id: person.id,
      name: person.full_name || person.name || 'User',
      nameBn: person.full_name_bn || person.nameBn || '',
      phone: person.phone || '',
      nationalId: person.national_id || '',
      district: person.district || 'Dhaka',
      division: person.division || 'Dhaka',
      roleId: resolvedRoleId,
      office: person.office || `DLAO ${person.district || 'Dhaka'}`
    };

    setCurrentUser(userObj);
    setCurrentRoleId(resolvedRoleId);

    localStorage.setItem('adlasb_current_user', JSON.stringify(userObj));
    localStorage.setItem('adlasb_active_role', resolvedRoleId);
    localStorage.setItem('adlasb_active_user_id', userObj.id);
    localStorage.setItem('adlasb_active_user_name', userObj.name);
    localStorage.setItem('adlasb_active_user_office', userObj.office);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('adlasb_current_user');
    localStorage.removeItem('adlasb_active_role');
    localStorage.removeItem('adlasb_active_user_id');
    localStorage.removeItem('adlasb_active_user_name');
    localStorage.removeItem('adlasb_active_user_office');
  };

  return (
    <RoleContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        activeRole,
        currentRoleId,
        setRole: setCurrentRoleId,
        AVAILABLE_ROLES
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
