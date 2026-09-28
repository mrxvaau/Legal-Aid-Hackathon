/**
 * ADLASB REST API Client
 * Backend communication layer with role header propagation
 */

const API_BASE = '/api';

function getAuthHeaders() {
  const activeRole = localStorage.getItem('adlasb_active_role') || 'B1_DLAO_OFFICER';
  const activeUserId = localStorage.getItem('adlasb_active_user_id') || `USR-${activeRole}`;
  const activeUserName = localStorage.getItem('adlasb_active_user_name') || `${activeRole} User`;
  const activeUserOffice = localStorage.getItem('adlasb_active_user_office') || 'DLAO Dhaka';
  return {
    'Content-Type': 'application/json',
    'x-user-role': activeRole,
    'x-user-id': activeUserId,
    'x-user-name': activeUserName,
    'x-user-office': activeUserOffice
  };
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `HTTP error ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // System
  getHealth: () => request('/health'),
  getMetadata: () => request('/meta'),

  // Applications
  getApplications: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/applications${q ? `?${q}` : ''}`);
  },
  getApplication: (id) => request(`/applications/${id}`),
  createApplication: (payload) => request('/applications', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Cases
  getCases: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/cases${q ? `?${q}` : ''}`);
  },
  getCase: (id) => request(`/cases/${id}`),
  createCase: (payload) => request('/cases', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  updateCaseStatus: (id, status, notes = '') => request(`/cases/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes })
  }),
  assignLawyer: (id, lawyer_id) => request(`/cases/${id}/lawyer`, {
    method: 'POST',
    body: JSON.stringify({ lawyer_id })
  }),

  // Sub-resources
  addCasePerson: (caseId, payload) => request(`/cases/${caseId}/people`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  createCaseTask: (caseId, payload) => request(`/cases/${caseId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  createCaseReferral: (caseId, payload) => request(`/cases/${caseId}/referrals`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  acceptCaseReferral: (caseId, referralId) => request(`/cases/${caseId}/referrals/${referralId}/accept`, {
    method: 'POST'
  }),
  createCaseIncident: (caseId, payload) => request(`/cases/${caseId}/incidents`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  confirmProvenance: (caseId, provId) => request(`/cases/${caseId}/provenance/${provId}/confirm`, {
    method: 'POST'
  }),
  createCaseEvent: (caseId, payload) => request(`/cases/${caseId}/events`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  // Safe Contact (Flow 1)
  configureSafeContact: (caseId, payload) => request(`/cases/${caseId}/safe-contact`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getSafeContacts: (caseId) => request(`/cases/${caseId}/safe-contact`),
  // Referrals
  acknowledgeCaseReferral: (caseId, referralId, payload = {}) => request(`/cases/${caseId}/referrals/${referralId}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  assignReferralOwnership: (caseId, referralId, payload) => request(`/cases/${caseId}/referrals/${referralId}/ownership`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  updateReferralStatus: (caseId, referralId, payload) => request(`/cases/${caseId}/referrals/${referralId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }),
  // Flow 3: Sensitive Evidence Vault
  getCaseEvidence: (caseId) => request(`/cases/${caseId}/evidence`),
  getEvidenceItem: (caseId, evidenceId) => request(`/cases/${caseId}/evidence/${evidenceId}`),
  registerCaseEvidence: (caseId, payload) => request(`/cases/${caseId}/evidence`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  // Flow 2: Offline Synchronization & AI Pre-Assessment
  syncApplication: (payload) => request('/sync/applications', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  resolveConflict: (payload) => request('/sync/resolve-conflict', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  aiPreAssess: (payload) => request('/ai-pre-assess', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  // Flow 4: Lawyer Accountability & Non-Smartphone Citizen Status Query
  getCitizenStatus: (query) => request(`/citizen/status?query=${encodeURIComponent(query)}`),
  recordLawyerActivity: (caseId, payload) => request(`/cases/${caseId}/lawyer/activity`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  escalateLawyer: (caseId, payload) => request(`/cases/${caseId}/lawyer/escalate`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  // People & Demo Authentication
  getPeople: () => request('/people'),
  registerPerson: (payload) => request('/people/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  lookupPerson: (payload) => request('/people/lookup', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  // Emergency / Danger Alert System
  sendEmergencyAlert: (payload) => request('/emergency/alert', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getEmergencyAlerts: () => request('/emergency/alerts'),
  acknowledgeEmergencyAlert: (id) => request(`/emergency/alerts/${id}/acknowledge`, {
    method: 'POST'
  })
};

export default api;
