import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

export default function EvidenceVaultCard({ caseId, evidence = [], onRefresh }) {
  const { language, t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [inspectingId, setInspectingId] = useState(null);
  const [inspectedData, setInspectedData] = useState({});
  const [accessErrors, setAccessErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    evidence_type: 'ALTERED_IMAGE',
    title: '',
    title_bn: '',
    original_filename: '',
    mime_type: 'image/jpeg',
    file_size_bytes: 2097152,
    sensitivity_level: 'STRICTLY_RESTRICTED_IMAGE_ABUSE',
    chain_of_custody_notes: '',
    raw_content: ''
  });

  const handleInspect = async (evidenceId) => {
    setInspectingId(evidenceId);
    setAccessErrors(prev => ({ ...prev, [evidenceId]: null }));
    try {
      const res = await api.getEvidenceItem(caseId, evidenceId);
      setInspectedData(prev => ({ ...prev, [evidenceId]: res.data }));
      if (onRefresh) onRefresh();
    } catch (err) {
      const status = err.status || (err.data && err.data.status) || 403;
      setAccessErrors(prev => ({
        ...prev,
        [evidenceId]: {
          status,
          message: err.message || 'Access Denied: Role lacks evidence:read_sensitive clearance.'
        }
      }));
      if (onRefresh) onRefresh();
    } finally {
      setInspectingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.registerCaseEvidence(caseId, formData);
      setShowAddForm(false);
      setFormData({
        evidence_type: 'ALTERED_IMAGE',
        title: '',
        title_bn: '',
        original_filename: '',
        mime_type: 'image/jpeg',
        file_size_bytes: 2097152,
        sensitivity_level: 'STRICTLY_RESTRICTED_IMAGE_ABUSE',
        chain_of_custody_notes: '',
        raw_content: ''
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
  };

  return (
    <div className="card-box" style={{ borderTop: '4px solid #DC2626' }}>
      {/* Header */}
      <div className="card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              🔒 {t('evidence.title')}
            </h3>
            <span style={{
              background: '#FEE2E2',
              color: '#991B1B',
              fontSize: '11px',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid #F87171'
            }}>
              {t('evidence.restrictedAccess')}
            </span>
            <span style={{
              background: '#EFF6FF',
              color: '#1D4ED8',
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '4px'
            }}>
              {t('evidence.accessLogged')}
            </span>
          </div>
          <p className="card-subtitle" style={{ marginTop: '4px' }}>
            {t('evidence.subtitle')}
          </p>
        </div>

        <button
          className="btn-secondary-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? t('common.cancel') : `+ ${t('evidence.registerEvidence')}`}
        </button>
      </div>

      {/* Governance & Compliance Warning Banner */}
      <div style={{
        background: '#FEF2F2',
        borderLeft: '4px solid #DC2626',
        padding: '12px 16px',
        borderRadius: '6px',
        marginBottom: '16px',
        fontSize: '13px',
        color: '#7F1D1D',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
      }}>
        <span style={{ fontSize: '20px', lineHeight: 1 }}>🛡️</span>
        <div>
          <strong style={{ display: 'block', color: '#991B1B', marginBottom: '2px' }}>
            {t('evidence.governanceNoticeTitle')}
          </strong>
          <span>{t('evidence.governanceNoticeDesc')}</span>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#991B1B', fontWeight: '600' }}>
            🏷️ {t('evidence.explicitLabels')}: 
            <span style={{ marginLeft: '6px', textDecoration: 'underline' }}>{t('evidence.labelSensitive')}</span> • 
            <span style={{ marginLeft: '6px', textDecoration: 'underline' }}>{t('evidence.labelRestricted')}</span> • 
            <span style={{ marginLeft: '6px', textDecoration: 'underline' }}>{t('evidence.labelLogged')}</span>
          </div>
        </div>
      </div>

      {/* Form to Register Evidence */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="inline-form-box" style={{ marginBottom: '18px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1F2937' }}>
            ➕ {t('evidence.registerTitle')}
          </h4>

          {formError && <div className="inline-error" style={{ marginBottom: '10px' }}>⚠️ {formError}</div>}

          <div className="form-grid-3">
            <div>
              <label className="form-label">{t('evidence.evidenceType')} *</label>
              <select
                className="form-input"
                value={formData.evidence_type}
                onChange={(e) => setFormData({ ...formData, evidence_type: e.target.value })}
              >
                <option value="ALTERED_IMAGE">Altered / Morphed Intimate Image</option>
                <option value="BLACKMAIL_MESSAGE_LOG">Blackmail / Extortion Chat Log</option>
                <option value="URL_SCREENSHOT">Distribution Platform Screenshot</option>
                <option value="AUDIO_RECORDING">Threat Voice Note</option>
                <option value="OTHER">Other Sensitive Material</option>
              </select>
            </div>
            <div>
              <label className="form-label">{t('evidence.sensitivityLevel')} *</label>
              <select
                className="form-input"
                value={formData.sensitivity_level}
                onChange={(e) => setFormData({ ...formData, sensitivity_level: e.target.value })}
              >
                <option value="STRICTLY_RESTRICTED_IMAGE_ABUSE">Strictly Restricted (Image Abuse)</option>
                <option value="CONFIDENTIAL">Confidential Evidence</option>
                <option value="STANDARD">Standard Evidentiary Record</option>
              </select>
            </div>
            <div>
              <label className="form-label">{t('evidence.originalFilename')} *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.original_filename}
                onChange={(e) => setFormData({ ...formData, original_filename: e.target.value })}
                placeholder="e.g. photo_evidence_morphed.jpg"
              />
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '10px' }}>
            <div>
              <label className="form-label">{t('evidence.evidenceTitle')} (EN) *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Morphed victim photo circulated in Telegram"
              />
            </div>
            <div>
              <label className="form-label">{t('evidence.evidenceTitle')} (BN)</label>
              <input
                type="text"
                className="form-input"
                value={formData.title_bn}
                onChange={(e) => setFormData({ ...formData, title_bn: e.target.value })}
                placeholder="প্রমাণাদির বিবরণ (বাংলায়)"
              />
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '10px' }}>
            <div>
              <label className="form-label">{t('evidence.mimeType')} *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.mime_type}
                onChange={(e) => setFormData({ ...formData, mime_type: e.target.value })}
                placeholder="image/jpeg or application/pdf"
              />
            </div>
            <div>
              <label className="form-label">{t('evidence.rawSampleData')}</label>
              <input
                type="text"
                className="form-input"
                value={formData.raw_content}
                onChange={(e) => setFormData({ ...formData, raw_content: e.target.value })}
                placeholder="Sample text or binary string for SHA-256 hashing"
              />
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <label className="form-label">{t('evidence.chainOfCustody')}</label>
            <input
              type="text"
              className="form-input"
              value={formData.chain_of_custody_notes}
              onChange={(e) => setFormData({ ...formData, chain_of_custody_notes: e.target.value })}
              placeholder="e.g. Deposited during 16699 intake; verified by receiving officer"
            />
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary-sm" onClick={() => setShowAddForm(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary-sm" disabled={submitting}>
              {submitting ? 'Registering...' : `🔒 ${t('evidence.saveEvidence')}`}
            </button>
          </div>
        </form>
      )}

      {/* Evidence Items List */}
      <div className="evidence-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {evidence.length === 0 ? (
          <p className="empty-hint">{t('common.none')}</p>
        ) : (
          evidence.map((ev) => {
            const isStrictRestricted = ev.sensitivity_level === 'STRICTLY_RESTRICTED_IMAGE_ABUSE';
            const isConfidential = ev.sensitivity_level === 'CONFIDENTIAL';
            const displayTitle = language === 'bn' && ev.title_bn ? ev.title_bn : ev.title;
            const inspected = inspectedData[ev.id];
            const accessError = accessErrors[ev.id];

            return (
              <div
                key={ev.id}
                style={{
                  background: '#FFFFFF',
                  border: isStrictRestricted ? '2px solid #F87171' : '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {/* Top Row: Type, Sensitivity Tag, ID */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: '#1F2937',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '4px'
                    }}>
                      {ev.id}
                    </span>

                    <span style={{
                      background: '#F3F4F6',
                      color: '#374151',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid #D1D5DB'
                    }}>
                      {ev.evidence_type}
                    </span>

                    {isStrictRestricted && (
                      <span style={{
                        background: '#FEE2E2',
                        color: '#991B1B',
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #EF4444'
                      }}>
                        🔒 STRICTLY RESTRICTED (IMAGE ABUSE)
                      </span>
                    )}

                    {isConfidential && (
                      <span style={{
                        background: '#FEF3C7',
                        color: '#92400E',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #F59E0B'
                      }}>
                        🔒 CONFIDENTIAL
                      </span>
                    )}

                    <span style={{
                      background: '#ECFDF5',
                      color: '#065F46',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '4px'
                    }}>
                      Status: {ev.evidence_status}
                    </span>
                  </div>

                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    📅 {ev.submitted_at ? new Date(ev.submitted_at).toLocaleDateString() : 'Recorded'}
                  </span>
                </div>

                {/* Evidence Title */}
                <h4 style={{ margin: '10px 0 6px 0', fontSize: '15px', color: '#111827', fontWeight: '700' }}>
                  {displayTitle}
                </h4>

                {/* File Specs Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '8px',
                  background: '#F9FAFB',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  margin: '8px 0'
                }}>
                  <div>
                    <span style={{ color: '#6B7280' }}>{t('evidence.file')}: </span>
                    <strong style={{ color: '#1F2937' }}>{ev.original_filename}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280' }}>{t('evidence.format')}: </span>
                    <strong style={{ color: '#1F2937' }}>{ev.mime_type}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280' }}>{t('evidence.size')}: </span>
                    <strong style={{ color: '#1F2937' }}>{formatBytes(ev.file_size_bytes)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280' }}>{t('evidence.submittedBy')}: </span>
                    <strong style={{ color: '#1F2937' }}>{ev.submitted_by_role}</strong>
                  </div>
                </div>

                {/* Cryptographic SHA-256 Hash Display */}
                <div style={{
                  background: ev.is_sensitive_restricted ? '#FEF2F2' : '#F0FDF4',
                  border: ev.is_sensitive_restricted ? '1px dashed #FCA5A5' : '1px solid #86EFAC',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <strong style={{ color: ev.is_sensitive_restricted ? '#991B1B' : '#166534' }}>
                    🔑 SHA-256 Checksum:
                  </strong>
                  <code style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: ev.is_sensitive_restricted ? '#B91C1C' : '#14532D',
                    wordBreak: 'break-all'
                  }}>
                    {ev.hash_checksum}
                  </code>
                </div>

                {/* Storage Reference (Prototype Vault URI) */}
                <div style={{ fontSize: '11px', color: '#4B5563', marginBottom: '8px' }}>
                  📦 <strong>{t('evidence.storageRef')}:</strong>{' '}
                  <code style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                    {ev.storage_ref}
                  </code>
                </div>

                {/* Chain of Custody */}
                {ev.chain_of_custody_notes && (
                  <div style={{
                    fontSize: '12px',
                    color: '#374151',
                    background: '#F3F4F6',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}>
                    ⛓️ <strong>{t('evidence.chainOfCustody')}:</strong> {ev.chain_of_custody_notes}
                  </div>
                )}

                {/* Action Row: Test Inspection / Decryption */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                  <button
                    className="btn-secondary-sm"
                    style={{
                      background: '#1F2937',
                      color: '#FFFFFF',
                      borderColor: '#1F2937',
                      fontWeight: '700',
                      padding: '6px 14px'
                    }}
                    disabled={inspectingId === ev.id}
                    onClick={() => handleInspect(ev.id)}
                  >
                    {inspectingId === ev.id ? 'Checking Permission...' : `👁️ ${t('evidence.inspectArtifact')}`}
                  </button>

                  <span style={{ fontSize: '11px', color: '#6B7280' }}>
                    ({t('evidence.inspectAuditNotice')})
                  </span>
                </div>

                {/* 403 Forbidden Access Denial Display */}
                {accessError && (
                  <div style={{
                    marginTop: '12px',
                    background: '#FEF2F2',
                    border: '2px solid #DC2626',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    color: '#991B1B',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '18px' }}>🚫</span>
                      <strong style={{ fontSize: '13px', color: '#7F1D1D' }}>
                        {t('evidence.accessDeniedTitle')} ({accessError.status} Forbidden)
                      </strong>
                    </div>
                    <p style={{ margin: '4px 0 0 0' }}>
                      {accessError.message}
                    </p>
                    <div style={{
                      marginTop: '6px',
                      fontSize: '11px',
                      background: '#FEE2E2',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      ⚖️ {t('evidence.accessDeniedAuditNote')}
                    </div>
                  </div>
                )}

                {/* Decrypted Evidentiary Artifact Modal / Panel */}
                {inspected && (
                  <div style={{
                    marginTop: '12px',
                    background: '#ECFDF5',
                    border: '2px solid #059669',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    color: '#065F46',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '18px' }}>✓</span>
                      <strong style={{ fontSize: '13px', color: '#047857' }}>
                        {t('evidence.accessGrantedTitle')} (Authorized Officer Clearance Verified)
                      </strong>
                    </div>
                    <p style={{ margin: '4px 0', fontFamily: 'monospace', background: '#D1FAE5', padding: '6px 10px', borderRadius: '4px' }}>
                      {inspected.decrypted_prototype_preview}
                    </p>
                    <div style={{ fontSize: '11px', color: '#065F46', marginTop: '4px' }}>
                      📜 {t('evidence.accessGrantedAuditNote')}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
