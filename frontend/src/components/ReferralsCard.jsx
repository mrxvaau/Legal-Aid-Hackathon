import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

const REFERRAL_STATUS_LIFECYCLE = ['PENDING', 'SENT', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED'];

export default function ReferralsCard({ caseId, referrals = [], onRefresh }) {
  const { language, t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [reassigningId, setReassigningId] = useState(null);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [ackOfficerId, setAckOfficerId] = useState('');
  const [ackNotes, setAckNotes] = useState('');

  const [formData, setFormData] = useState({
    referral_type: 'CYBER_CRIME_DIVISION',
    referring_office: 'DLAO Dhaka Cyber Desk',
    receiving_office: 'Police Cyber Support for Women (PCSW) - CID HQ',
    target_authority_type: 'CYBER_CRIME_POLICE',
    reason: 'Emergency BTRC takedown and subscriber log preservation under Cyber Security Act',
    reason_bn: 'সাইবার নিরাপত্তা আইন অনুযায়ী জরুরি বিটিআরসি কনটেন্ট অপসারণ ও সাবস্ক্রাইবার লগ সংরক্ষণের অনুরোধ',
    notes: 'Non-consensual altered image distribution across Telegram messaging channels.'
  });

  const [acceptingId, setAcceptingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAccept = async (refId) => {
    setAcceptingId(refId);
    setError(null);
    try {
      await api.acceptCaseReferral(caseId, refId);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleAcknowledge = async (refId) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.acknowledgeCaseReferral(caseId, refId, {
        assigned_officer_id: ackOfficerId || 'OFFICER-CID-CYBER-88',
        notes: ackNotes || 'PCSW CID HQ Desk formally acknowledged referral and verified evidence package.'
      });
      setAcknowledgingId(null);
      setAckOfficerId('');
      setAckNotes('');
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassignOwner = async (refId) => {
    if (!newOwnerId) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.assignReferralOwnership(caseId, refId, {
        assigned_officer_id: newOwnerId,
        notes: reassignNotes || 'Ownership reassigned by receiving supervisory desk'
      });
      setReassigningId(null);
      setNewOwnerId('');
      setReassignNotes('');
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (refId, newStatus) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.updateReferralStatus(caseId, refId, {
        status: newStatus,
        notes: `Referral lifecycle updated to ${newStatus}`
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createCaseReferral(caseId, formData);
      setShowAddForm(false);
      setFormData({
        referral_type: 'DLAO_TO_DLAO',
        referring_office: 'DLAO Dhaka',
        receiving_office: 'DLAO Chattogram',
        target_authority_type: 'DLAO',
        reason: '',
        reason_bn: '',
        notes: ''
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-box">
      {/* Header */}
      <div className="card-header">
        <div>
          <h3 className="card-title">🔄 {t('referrals.title')}</h3>
          <p className="card-subtitle">
            {t('referrals.subtitle')}
          </p>
        </div>
        <button
          className="btn-secondary-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? t('common.cancel') : `+ ${t('referrals.createReferral')}`}
        </button>
      </div>

      {/* Mandatory External Simulation Disclosure Banner */}
      <div style={{
        background: '#F0FDF4',
        border: '1px solid #86EFAC',
        borderRadius: '6px',
        padding: '10px 14px',
        marginBottom: '14px',
        fontSize: '12px',
        color: '#166534',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '18px' }}>ℹ️</span>
        <div>
          <strong>{t('referrals.simulationNoticeLabel')}: </strong>
          <span>"{t('referrals.simulationNotice')}"</span>
        </div>
      </div>

      {error && <div className="inline-error" style={{ marginBottom: '12px' }}>⚠️ {error}</div>}

      {/* Add Referral Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="inline-form-box" style={{ marginBottom: '16px' }}>
          <div className="form-grid-3">
            <div>
              <label className="form-label">{t('referrals.referralType')} *</label>
              <select
                className="form-input"
                value={formData.referral_type}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'CYBER_CRIME_DIVISION') {
                    setFormData({
                      ...formData,
                      referral_type: val,
                      target_authority_type: 'CYBER_CRIME_POLICE',
                      receiving_office: 'Police Cyber Support for Women (PCSW) - CID HQ',
                      reason: 'Emergency BTRC takedown and subscriber log preservation under Cyber Security Act',
                      reason_bn: 'সাইবার নিরাপত্তা আইন অনুযায়ী জরুরি বিটিআরসি কনটেন্ট অপসারণ ও সাবস্ক্রাইবার লগ সংরক্ষণের অনুরোধ'
                    });
                  } else {
                    setFormData({ ...formData, referral_type: val, target_authority_type: 'DLAO' });
                  }
                }}
              >
                <option value="CYBER_CRIME_DIVISION">🚨 Police Cyber Support for Women (PCSW), CID HQ</option>
                <option value="DLAO_TO_DLAO">DLAO to DLAO (Inter-district)</option>
                <option value="INTERNAL_TRANSFER">Internal DLAO Transfer</option>
                <option value="POLICE_FORWARDING">Local Thana Forwarding</option>
                <option value="SOCIAL_SERVICES">Social Welfare / One-Stop Crisis</option>
                <option value="NGO_LEGAL_CLINIC">Partner Legal NGO Clinic</option>
              </select>
            </div>
            <div>
              <label className="form-label">{t('referrals.fromOffice')} *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.referring_office}
                onChange={(e) => setFormData({ ...formData, referring_office: e.target.value })}
                placeholder="e.g. DLAO Dhaka Cyber Desk"
              />
            </div>
            <div>
              <label className="form-label">{t('referrals.toOffice')} *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.receiving_office}
                onChange={(e) => setFormData({ ...formData, receiving_office: e.target.value })}
                placeholder="e.g. Police Cyber Support for Women (PCSW) - CID HQ"
              />
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '10px' }}>
            <div>
              <label className="form-label">{t('referrals.reason')} (EN) *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Legal basis or cross-district assistance required"
              />
            </div>
            <div>
              <label className="form-label">{t('referrals.reason')} (BN)</label>
              <input
                type="text"
                className="form-input"
                value={formData.reason_bn}
                onChange={(e) => setFormData({ ...formData, reason_bn: e.target.value })}
                placeholder="রেফারেলের কারণ (বাংলায়)"
              />
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <label className="form-label">{t('referrals.notes')}</label>
            <input
              type="text"
              className="form-input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. High priority digital evidence hash attached."
            />
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary-sm" onClick={() => setShowAddForm(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary-sm" disabled={submitting}>
              {submitting ? 'Transmitting...' : t('common.save')}
            </button>
          </div>
        </form>
      )}

      {/* Referrals List */}
      <div className="referral-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {referrals.length === 0 ? (
          <p className="empty-hint">{t('common.none')}</p>
        ) : (
          referrals.map((ref) => {
            const isPcsw = ref.receiving_office?.includes('Police Cyber Support') || ref.referral_type === 'CYBER_CRIME_DIVISION';
            const displayReason = language === 'bn' && ref.reason_bn ? ref.reason_bn : ref.reason;
            const currentOwner = ref.owner_display || ref.assigned_officer_id || 'UNASSIGNED';
            const isAck = ref.acknowledgement_status === 'ACKNOWLEDGED';

            return (
              <div
                key={ref.id}
                style={{
                  background: '#FFFFFF',
                  border: isPcsw ? '2px solid #EF4444' : '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {/* PCSW Urgent Highlight Badge */}
                {isPcsw && (
                  <div style={{
                    background: '#FEF2F2',
                    borderLeft: '4px solid #DC2626',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    fontSize: '12px',
                    color: '#991B1B',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '6px'
                  }}>
                    <span>🚨 {t('referrals.pcswBadge')}</span>
                    <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#7F1D1D' }}>
                      ({t('referrals.simulatedAgencyTag')})
                    </span>
                  </div>
                )}

                {/* Routing & Status Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={`ref-status-badge ${ref.status.toLowerCase()}`}>
                        {ref.status}
                      </span>
                      <span className="ref-type-badge">{ref.referral_type}</span>
                      <span style={{
                        background: isAck ? '#ECFDF5' : '#FFFBEB',
                        color: isAck ? '#065F46' : '#92400E',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: isAck ? '1px solid #6EE7B7' : '1px solid #FCD34D'
                      }}>
                        {isAck ? `✓ ${t('referrals.acknowledged')}` : `⏳ ${t('referrals.unacknowledged')}`}
                      </span>
                    </div>

                    <div className="ref-routing" style={{ marginTop: '8px' }}>
                      🏛️ <strong>{ref.referring_office}</strong> ➔ 🏢 <strong>{ref.receiving_office}</strong>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {!isAck && (
                      <button
                        className="btn-primary-sm"
                        style={{ background: '#059669', borderColor: '#059669' }}
                        onClick={() => setAcknowledgingId(acknowledgingId === ref.id ? null : ref.id)}
                      >
                        ✓ {t('referrals.acknowledgeBtn')}
                      </button>
                    )}

                    <button
                      className="btn-secondary-sm"
                      onClick={() => setReassigningId(reassigningId === ref.id ? null : ref.id)}
                    >
                      👤 {t('referrals.reassignOwnerBtn')}
                    </button>
                  </div>
                </div>

                {/* Ownership Tracking Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '8px',
                  background: '#F9FAFB',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  margin: '10px 0'
                }}>
                  <div>
                    <span style={{ color: '#6B7280' }}>{t('referrals.currentOwner')}: </span>
                    <strong style={{ color: currentOwner === 'UNASSIGNED' ? '#DC2626' : '#1D4ED8' }}>
                      {currentOwner}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280' }}>{t('referrals.ackTimestamp')}: </span>
                    <strong style={{ color: '#1F2937' }}>
                      {ref.acknowledged_at ? new Date(ref.acknowledged_at).toLocaleString() : 'Pending'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280' }}>{t('referrals.lifecycleStatus')}: </span>
                    <select
                      value={ref.status}
                      onChange={(e) => handleStatusChange(ref.id, e.target.value)}
                      disabled={actionLoading}
                      style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}
                    >
                      {REFERRAL_STATUS_LIFECYCLE.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="ref-reason" style={{ margin: '6px 0', fontSize: '13px' }}>
                  <strong>{t('referrals.reason')}:</strong> {displayReason}
                </p>

                {ref.notes && (
                  <p className="ref-notes" style={{ margin: '4px 0', fontSize: '12px', color: '#4B5563' }}>
                    📝 {ref.notes}
                  </p>
                )}

                {/* Inline Acknowledge Form */}
                {acknowledgingId === ref.id && (
                  <div style={{
                    marginTop: '10px',
                    background: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    borderRadius: '6px',
                    padding: '12px'
                  }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#166534', fontSize: '13px' }}>
                      ✓ {t('referrals.ackModalTitle')}
                    </h5>
                    <div className="form-grid-2">
                      <div>
                        <label className="form-label">{t('referrals.ackOfficerInput')}</label>
                        <input
                          type="text"
                          className="form-input"
                          value={ackOfficerId}
                          onChange={(e) => setAckOfficerId(e.target.value)}
                          placeholder="e.g. OFFICER-CID-CYBER-88"
                        />
                      </div>
                      <div>
                        <label className="form-label">{t('referrals.ackNotesInput')}</label>
                        <input
                          type="text"
                          className="form-input"
                          value={ackNotes}
                          onChange={(e) => setAckNotes(e.target.value)}
                          placeholder="Acknowledgement note..."
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className="btn-secondary-sm" onClick={() => setAcknowledgingId(null)}>
                        {t('common.cancel')}
                      </button>
                      <button
                        className="btn-primary-sm"
                        style={{ background: '#059669' }}
                        disabled={actionLoading}
                        onClick={() => handleAcknowledge(ref.id)}
                      >
                        {actionLoading ? 'Saving...' : t('referrals.confirmAck')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Reassign Owner Form */}
                {reassigningId === ref.id && (
                  <div style={{
                    marginTop: '10px',
                    background: '#EFF6FF',
                    border: '1px solid #93C5FD',
                    borderRadius: '6px',
                    padding: '12px'
                  }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#1E40AF', fontSize: '13px' }}>
                      👤 {t('referrals.reassignModalTitle')}
                    </h5>
                    <div className="form-grid-2">
                      <div>
                        <label className="form-label">{t('referrals.newOwnerId')} *</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          value={newOwnerId}
                          onChange={(e) => setNewOwnerId(e.target.value)}
                          placeholder="e.g. OFFICER-CID-CYBER-92"
                        />
                      </div>
                      <div>
                        <label className="form-label">{t('referrals.reassignReason')}</label>
                        <input
                          type="text"
                          className="form-input"
                          value={reassignNotes}
                          onChange={(e) => setReassignNotes(e.target.value)}
                          placeholder="Reason for transfer..."
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className="btn-secondary-sm" onClick={() => setReassigningId(null)}>
                        {t('common.cancel')}
                      </button>
                      <button
                        className="btn-primary-sm"
                        disabled={actionLoading || !newOwnerId}
                        onClick={() => handleReassignOwner(ref.id)}
                      >
                        {actionLoading ? 'Updating...' : t('referrals.confirmReassign')}
                      </button>
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
