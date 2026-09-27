import React from 'react';
import { useLanguage } from '../i18n';

/**
 * 4-Tier Semantic Status Classification:
 * 1. Urgent (Red family): Critical risk, overdue alerts, escalation required, rejections
 * 2. Active (Amber family): Under review, in progress, mediation, referred, waiting, stale
 * 3. Resolved (Green family): Assigned, settled, confirmed, closed, resolved
 * 4. Informational (Slate family): New, draft, submitted, intake, pending
 */
const STATUS_TIER_MAP = {
  // Urgent Tier
  URGENT: 'urgent',
  OVERDUE_ESCALATION: 'urgent',
  ESCALATION_REQUIRED: 'urgent',
  REJECTED: 'urgent',
  HIGH_RISK: 'urgent',

  // Active Tier
  UNDER_REVIEW: 'active',
  IN_PROGRESS: 'active',
  MEDIATION: 'active',
  REFERRED: 'active',
  SETTLEMENT_DRAFT: 'active',
  WAITING_FOR_ACTION: 'active',
  STALE_CONTACT: 'active',
  IN_MEDIATION: 'active',
  PENDING_SYNC: 'active',

  // Resolved Tier
  RESOLVED: 'resolved',
  ASSIGNED: 'resolved',
  CLOSED: 'resolved',
  SETTLED: 'resolved',
  CONFIRMED_FINAL: 'resolved',
  SYNCED: 'resolved',

  // Informational Tier
  NEW: 'info',
  INTAKE: 'info',
  DRAFT: 'info',
  SUBMITTED: 'info',
  PENDING_REVIEW: 'info'
};

const TIER_STYLES = {
  urgent: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    dot: '#DC2626'
  },
  active: {
    bg: '#FFFBEB',
    text: '#92400E',
    border: '#FDE68A',
    dot: '#D97706'
  },
  resolved: {
    bg: '#F0FDF4',
    text: '#166534',
    border: '#BBF7D0',
    dot: '#16A34A'
  },
  info: {
    bg: '#F8FAFC',
    text: '#334155',
    border: '#CBD5E1',
    dot: '#64748B'
  }
};

export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  const normalizedStatus = (status || 'NEW').toUpperCase().replace(/\s+/g, '_');
  const tier = STATUS_TIER_MAP[normalizedStatus] || 'info';
  const styles = TIER_STYLES[tier];
  const label = t(`states.${normalizedStatus}`, status || 'New');

  return (
    <span
      className={`gov-badge gov-badge-${tier}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '0.02em',
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: styles.dot,
          flexShrink: 0
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
