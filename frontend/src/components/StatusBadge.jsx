import React from 'react';
import { useLanguage } from '../i18n';

const STATE_COLORS = {
  NEW: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  INTAKE: { bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' },
  UNDER_REVIEW: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  ASSIGNED: { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  IN_PROGRESS: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
  REFERRED: { bg: '#FDF2F8', text: '#BE185D', border: '#FBCFE8' },
  MEDIATION: { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' },
  SETTLEMENT_DRAFT: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  WAITING_FOR_ACTION: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  RESOLVED: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  CLOSED: { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1' }
};

export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  const colors = STATE_COLORS[status] || STATE_COLORS.NEW;
  const label = t(`states.${status}`, status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: colors.text
        }}
      />
      {label}
    </span>
  );
}
