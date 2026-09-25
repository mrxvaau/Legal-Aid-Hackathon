/**
 * Constants for the ADLASB Digital Legal Aid System
 */

const ROLES = {
  B1_DLAO_OFFICER: 'B1_DLAO_OFFICER',
  B2_LEGAL_AID_OFFICER: 'B2_LEGAL_AID_OFFICER',
  B3_HELPLINE_AGENT: 'B3_HELPLINE_AGENT',
  B4_UDC_ENTREPRENEUR: 'B4_UDC_ENTREPRENEUR',
  B5_PANEL_LAWYER: 'B5_PANEL_LAWYER',
  B6_RECEIVING_DLAO: 'B6_RECEIVING_DLAO',
  B7_DLAO_ADMIN: 'B7_DLAO_ADMIN',
  CITIZEN_APPLICANT: 'CITIZEN_APPLICANT',
  AUTHORIZED_REPRESENTATIVE: 'AUTHORIZED_REPRESENTATIVE',
};

const ROLE_METADATA = {
  [ROLES.B1_DLAO_OFFICER]: {
    code: 'B1',
    nameEn: 'DLAO Officer',
    nameBn: 'ডিএলএও কর্মকর্তা',
    description: 'District Legal Aid Officer with administrative and judicial oversight.'
  },
  [ROLES.B2_LEGAL_AID_OFFICER]: {
    code: 'B2',
    nameEn: 'Legal Aid Officer / Mediator',
    nameBn: 'লিগ্যাল এইড অফিসার / মধ্যস্থতাকারী',
    description: 'Responsible for case review, ADR, and mediation sessions.'
  },
  [ROLES.B3_HELPLINE_AGENT]: {
    code: 'B3',
    nameEn: '16699 Helpline Agent',
    nameBn: '১৬৬৯৯ হেল্পলাইন এজেন্ট',
    description: 'First responder for telephonic intakes and initial advisory.'
  },
  [ROLES.B4_UDC_ENTREPRENEUR]: {
    code: 'B4',
    nameEn: 'UDC Entrepreneur',
    nameBn: 'ইউডিসি উদ্যোক্তা',
    description: 'Union Digital Centre grassroot assisted intake and document upload.'
  },
  [ROLES.B5_PANEL_LAWYER]: {
    code: 'B5',
    nameEn: 'Panel Lawyer',
    nameBn: 'প্যানেল আইনজীবী',
    description: 'Assigned legal counsel handling court hearings and legal filings.'
  },
  [ROLES.B6_RECEIVING_DLAO]: {
    code: 'B6',
    nameEn: 'Receiving DLAO',
    nameBn: 'প্রাপক ডিএলএও',
    description: 'DLAO receiving cross-district referrals or transferred proceedings.'
  },
  [ROLES.B7_DLAO_ADMIN]: {
    code: 'B7',
    nameEn: 'DLAO Admin / Case-Support Staff',
    nameBn: 'ডিএলএও অ্যাডমিন / কেস-সহকারী কর্মকর্তা',
    description: 'Registry and case support staff managing schedules and records.'
  },
  [ROLES.CITIZEN_APPLICANT]: {
    code: 'C1',
    nameEn: 'Citizen Applicant',
    nameBn: 'নাগরিক আবেদনকারী',
    description: 'Primary citizen seeking legal aid services.'
  },
  [ROLES.AUTHORIZED_REPRESENTATIVE]: {
    code: 'C2',
    nameEn: 'Authorized Representative',
    nameBn: 'অনুমোদিত প্রতিনিধি',
    description: 'Legally authorized representative acting on behalf of an applicant.'
  }
};

const CASE_STATES = {
  NEW: 'NEW',
  INTAKE: 'INTAKE',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  REFERRED: 'REFERRED',
  MEDIATION: 'MEDIATION',
  SETTLEMENT_DRAFT: 'SETTLEMENT_DRAFT',
  WAITING_FOR_ACTION: 'WAITING_FOR_ACTION',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
};

const CASE_STATE_METADATA = {
  [CASE_STATES.NEW]: {
    labelEn: 'New',
    labelBn: 'নতুন',
    color: '#3B82F6',
    descriptionEn: 'Application submitted, awaiting initial processing.'
  },
  [CASE_STATES.INTAKE]: {
    labelEn: 'Intake',
    labelBn: 'ইনটেক / প্রাথমিক গ্রহণ',
    color: '#06B6D4',
    descriptionEn: 'Preliminary interview and data intake underway.'
  },
  [CASE_STATES.UNDER_REVIEW]: {
    labelEn: 'Under Review',
    labelBn: 'পর্যালোচনাধীন',
    color: '#F59E0B',
    descriptionEn: 'Eligibility, means test, and merits under review by officer.'
  },
  [CASE_STATES.ASSIGNED]: {
    labelEn: 'Assigned',
    labelBn: 'দায়িত্ব অর্পিত',
    color: '#8B5CF6',
    descriptionEn: 'Assigned to specific panel lawyer or mediator.'
  },
  [CASE_STATES.IN_PROGRESS]: {
    labelEn: 'In Progress',
    labelBn: 'চলমান',
    color: '#6366F1',
    descriptionEn: 'Active legal proceeding or case advocacy.'
  },
  [CASE_STATES.REFERRED]: {
    labelEn: 'Referred',
    labelBn: 'স্থানান্তরিত / রেফার্ড',
    color: '#EC4899',
    descriptionEn: 'Referred to another DLAO district, court, or social institution.'
  },
  [CASE_STATES.MEDIATION]: {
    labelEn: 'Mediation',
    labelBn: 'সালিশ / মধ্যস্থতা',
    color: '#14B8A6',
    descriptionEn: 'Alternative dispute resolution in active sessions.'
  },
  [CASE_STATES.SETTLEMENT_DRAFT]: {
    labelEn: 'Settlement Draft',
    labelBn: 'মীমাংসা খসড়া',
    color: '#10B981',
    descriptionEn: 'Settlement agreement formulated, awaiting signatures.'
  },
  [CASE_STATES.WAITING_FOR_ACTION]: {
    labelEn: 'Waiting for Action',
    labelBn: 'পদক্ষেপের অপেক্ষায়',
    color: '#F97316',
    descriptionEn: 'Pending document submission, court date, or third-party response.'
  },
  [CASE_STATES.RESOLVED]: {
    labelEn: 'Resolved',
    labelBn: 'নিষ্পত্তিকৃত',
    color: '#22C55E',
    descriptionEn: 'Case successfully resolved via court judgment or mediation.'
  },
  [CASE_STATES.CLOSED]: {
    labelEn: 'Closed',
    labelBn: 'সমাপ্ত / বন্ধ',
    color: '#64748B',
    descriptionEn: 'Case administratively closed and archived.'
  }
};

const PROVENANCE_SOURCES = {
  SPOKEN_BY_PERSON: 'spoken_by_person',
  TYPED_BY_PERSON: 'typed_by_person',
  TYPED_BY_STAFF: 'typed_by_staff',
  TRANSLATED: 'translated',
  AI_ASSISTED: 'ai_assisted',
  INFERRED: 'inferred',
  CONFIRMED_BY_HUMAN: 'confirmed_by_human'
};

const AUDIT_ACTIONS = {
  APPLICATION_CREATED: 'APPLICATION_CREATED',
  APPLICATION_UPDATED: 'APPLICATION_UPDATED',
  CASE_CREATED: 'CASE_CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  PERSON_LINKED: 'PERSON_LINKED',
  REPRESENTATIVE_LINKED: 'REPRESENTATIVE_LINKED',
  PROVENANCE_RECORDED: 'PROVENANCE_RECORDED',
  PROVENANCE_CONFIRMED: 'PROVENANCE_CONFIRMED',
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  REFERRAL_CREATED: 'REFERRAL_CREATED',
  REFERRAL_ACCEPTED: 'REFERRAL_ACCEPTED',
  INCIDENT_LINKED: 'INCIDENT_LINKED',
  LAWYER_ASSIGNED: 'LAWYER_ASSIGNED',
  ACCESS_DENIED: 'ACCESS_DENIED'
};

const PERMISSIONS = {
  // Application
  APPLICATION_CREATE: 'application:create',
  APPLICATION_READ: 'application:read',
  APPLICATION_UPDATE: 'application:update',
  
  // Case
  CASE_CREATE: 'case:create',
  CASE_READ: 'case:read',
  CASE_UPDATE_STATUS: 'case:update_status',
  CASE_ASSIGN_LAWYER: 'case:assign_lawyer',
  CASE_MEDIATE: 'case:mediate',
  
  // People
  PEOPLE_LINK: 'people:link',
  PEOPLE_READ: 'people:read',
  
  // Tasks
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_READ: 'task:read',
  
  // Referrals
  REFERRAL_CREATE: 'referral:create',
  REFERRAL_ACCEPT: 'referral:accept',
  REFERRAL_READ: 'referral:read',
  
  // Incidents
  INCIDENT_LINK: 'incident:link',
  INCIDENT_READ: 'incident:read',
  
  // Provenance & Audit
  PROVENANCE_RECORD: 'provenance:record',
  PROVENANCE_CONFIRM: 'provenance:confirm',
  PROVENANCE_READ: 'provenance:read',
  AUDIT_READ: 'audit:read'
};

// Mapping of roles to granted permissions
const ROLE_PERMISSIONS = {
  [ROLES.B1_DLAO_OFFICER]: [
    PERMISSIONS.APPLICATION_CREATE, PERMISSIONS.APPLICATION_READ, PERMISSIONS.APPLICATION_UPDATE,
    PERMISSIONS.CASE_CREATE, PERMISSIONS.CASE_READ, PERMISSIONS.CASE_UPDATE_STATUS, PERMISSIONS.CASE_ASSIGN_LAWYER, PERMISSIONS.CASE_MEDIATE,
    PERMISSIONS.PEOPLE_LINK, PERMISSIONS.PEOPLE_READ,
    PERMISSIONS.TASK_CREATE, PERMISSIONS.TASK_UPDATE, PERMISSIONS.TASK_READ,
    PERMISSIONS.REFERRAL_CREATE, PERMISSIONS.REFERRAL_ACCEPT, PERMISSIONS.REFERRAL_READ,
    PERMISSIONS.INCIDENT_LINK, PERMISSIONS.INCIDENT_READ,
    PERMISSIONS.PROVENANCE_RECORD, PERMISSIONS.PROVENANCE_CONFIRM, PERMISSIONS.PROVENANCE_READ,
    PERMISSIONS.AUDIT_READ
  ],
  [ROLES.B2_LEGAL_AID_OFFICER]: [
    PERMISSIONS.APPLICATION_CREATE, PERMISSIONS.APPLICATION_READ, PERMISSIONS.APPLICATION_UPDATE,
    PERMISSIONS.CASE_CREATE, PERMISSIONS.CASE_READ, PERMISSIONS.CASE_UPDATE_STATUS, PERMISSIONS.CASE_ASSIGN_LAWYER, PERMISSIONS.CASE_MEDIATE,
    PERMISSIONS.PEOPLE_LINK, PERMISSIONS.PEOPLE_READ,
    PERMISSIONS.TASK_CREATE, PERMISSIONS.TASK_UPDATE, PERMISSIONS.TASK_READ,
    PERMISSIONS.REFERRAL_CREATE, PERMISSIONS.REFERRAL_READ,
    PERMISSIONS.INCIDENT_LINK, PERMISSIONS.INCIDENT_READ,
    PERMISSIONS.PROVENANCE_RECORD, PERMISSIONS.PROVENANCE_CONFIRM, PERMISSIONS.PROVENANCE_READ,
    PERMISSIONS.AUDIT_READ
  ],
  [ROLES.B3_HELPLINE_AGENT]: [
    PERMISSIONS.APPLICATION_CREATE, PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.CASE_READ,
    PERMISSIONS.PEOPLE_READ,
    PERMISSIONS.TASK_CREATE, PERMISSIONS.TASK_READ,
    PERMISSIONS.INCIDENT_LINK, PERMISSIONS.INCIDENT_READ,
    PERMISSIONS.PROVENANCE_RECORD, PERMISSIONS.PROVENANCE_READ
  ],
  [ROLES.B4_UDC_ENTREPRENEUR]: [
    PERMISSIONS.APPLICATION_CREATE, PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.CASE_READ,
    PERMISSIONS.PEOPLE_LINK, PERMISSIONS.PEOPLE_READ,
    PERMISSIONS.INCIDENT_LINK, PERMISSIONS.INCIDENT_READ,
    PERMISSIONS.PROVENANCE_RECORD, PERMISSIONS.PROVENANCE_READ
  ],
  [ROLES.B5_PANEL_LAWYER]: [
    PERMISSIONS.CASE_READ,
    PERMISSIONS.PEOPLE_READ,
    PERMISSIONS.TASK_UPDATE, PERMISSIONS.TASK_READ,
    PERMISSIONS.INCIDENT_READ,
    PERMISSIONS.PROVENANCE_RECORD, PERMISSIONS.PROVENANCE_READ,
    PERMISSIONS.AUDIT_READ
  ],
  [ROLES.B6_RECEIVING_DLAO]: [
    PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.CASE_CREATE, PERMISSIONS.CASE_READ, PERMISSIONS.CASE_UPDATE_STATUS,
    PERMISSIONS.PEOPLE_LINK, PERMISSIONS.PEOPLE_READ,
    PERMISSIONS.TASK_CREATE, PERMISSIONS.TASK_UPDATE, PERMISSIONS.TASK_READ,
    PERMISSIONS.REFERRAL_ACCEPT, PERMISSIONS.REFERRAL_READ,
    PERMISSIONS.INCIDENT_LINK, PERMISSIONS.INCIDENT_READ,
    PERMISSIONS.PROVENANCE_RECORD, PERMISSIONS.PROVENANCE_CONFIRM, PERMISSIONS.PROVENANCE_READ,
    PERMISSIONS.AUDIT_READ
  ],
  [ROLES.B7_DLAO_ADMIN]: [
    PERMISSIONS.APPLICATION_CREATE, PERMISSIONS.APPLICATION_READ, PERMISSIONS.APPLICATION_UPDATE,
    PERMISSIONS.CASE_CREATE, PERMISSIONS.CASE_READ, PERMISSIONS.CASE_UPDATE_STATUS,
    PERMISSIONS.PEOPLE_LINK, PERMISSIONS.PEOPLE_READ,
    PERMISSIONS.TASK_CREATE, PERMISSIONS.TASK_UPDATE, PERMISSIONS.TASK_READ,
    PERMISSIONS.REFERRAL_CREATE, PERMISSIONS.REFERRAL_READ,
    PERMISSIONS.INCIDENT_LINK, PERMISSIONS.INCIDENT_READ,
    PERMISSIONS.PROVENANCE_RECORD, PERMISSIONS.PROVENANCE_CONFIRM, PERMISSIONS.PROVENANCE_READ,
    PERMISSIONS.AUDIT_READ
  ],
  [ROLES.CITIZEN_APPLICANT]: [
    PERMISSIONS.APPLICATION_CREATE, PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.CASE_READ,
    PERMISSIONS.PEOPLE_READ,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.INCIDENT_READ,
    PERMISSIONS.PROVENANCE_READ
  ],
  [ROLES.AUTHORIZED_REPRESENTATIVE]: [
    PERMISSIONS.APPLICATION_CREATE, PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.CASE_READ,
    PERMISSIONS.PEOPLE_READ,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.INCIDENT_READ,
    PERMISSIONS.PROVENANCE_READ
  ]
};

module.exports = {
  ROLES,
  ROLE_METADATA,
  CASE_STATES,
  CASE_STATE_METADATA,
  PROVENANCE_SOURCES,
  AUDIT_ACTIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS
};
