import React, { useState } from 'react';
import { useLanguage } from '../i18n';

export default function AuditTrailView({ auditTrail = [] }) {
  const { t } = useLanguage();
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="card-box">
      <div className="card-header">
        <div>
          <h3 className="card-title">📜 {t('audit.title')}</h3>
          <p className="card-subtitle">{t('audit.subtitle')}</p>
        </div>
        <span className="badge-count">{auditTrail.length} Events</span>
      </div>

      <div className="audit-timeline">
        {auditTrail.length === 0 ? (
          <p className="empty-hint">{t('common.none')}</p>
        ) : (
          auditTrail.map((ev) => {
            const isExpanded = expandedId === ev.id;
            const hasPayload = ev.payload_before || ev.payload_after;

            return (
              <div key={ev.id} className="audit-event-item">
                <div className="audit-icon-marker">📌</div>
                <div className="audit-event-body">
                  <div className="audit-event-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="audit-action-tag">{ev.action}</span>
                      <span className="audit-actor">
                        By: <strong>{ev.actor_role}</strong> ({ev.actor_id})
                      </span>
                    </div>
                    <span className="audit-time">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>

                  {ev.notes && <p className="audit-notes">{ev.notes}</p>}

                  {hasPayload && (
                    <div>
                      <button
                        className="btn-toggle-diff"
                        onClick={() => toggleExpand(ev.id)}
                      >
                        {isExpanded ? '▲ Hide State Payload' : '▼ Inspect State Payload'}
                      </button>

                      {isExpanded && (
                        <div className="audit-diff-box">
                          {ev.payload_before && (
                            <div className="diff-col">
                              <div className="diff-label">State Before:</div>
                              <pre className="diff-pre">{JSON.stringify(ev.payload_before, null, 2)}</pre>
                            </div>
                          )}
                          {ev.payload_after && (
                            <div className="diff-col">
                              <div className="diff-label">State After:</div>
                              <pre className="diff-pre">{JSON.stringify(ev.payload_after, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
