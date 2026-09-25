import React from 'react';
import { useLanguage } from '../i18n';

const SOURCE_COLORS = {
  spoken_by_person: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', icon: '🎙️' },
  typed_by_person: { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC', icon: '⌨️' },
  typed_by_staff: { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD', icon: '📋' },
  translated: { bg: '#F3E8FF', text: '#6B21A8', border: '#D8B4FE', icon: '🌐' },
  ai_assisted: { bg: '#FCE7F3', text: '#9D174D', border: '#FBCFE8', icon: '🤖' },
  inferred: { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74', icon: '🔍' },
  confirmed_by_human: { bg: '#DCFCE7', text: '#166534', border: '#86EFAC', icon: '✅' }
};

export default function ProvenanceBadge({ source, isConfirmed = false }) {
  const { t } = useLanguage();
  const colors = SOURCE_COLORS[source] || { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1', icon: '🏷️' };
  const label = t(`provenance.${source}`, source);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '600',
          backgroundColor: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`
        }}
      >
        <span>{colors.icon}</span>
        {label}
      </span>
      {isConfirmed && source !== 'confirmed_by_human' && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '600',
            backgroundColor: '#DCFCE7',
            color: '#166534',
            border: '1px solid #86EFAC'
          }}
          title="Verified by Human Officer"
        >
          ✓ {t('provenance.confirmed_by_human')}
        </span>
      )}
    </div>
  );
}
