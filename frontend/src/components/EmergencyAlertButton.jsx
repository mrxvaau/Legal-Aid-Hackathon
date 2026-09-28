import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import { useRole } from '../hooks/useRole';
import api from '../services/api';
import { IconAlertTriangle, IconShield, IconPhone } from './Icons';

export default function EmergencyAlertButton({ currentView, caseId = null, applicationId = null }) {
  const { language } = useLanguage();
  const { currentUser } = useRole();

  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Check if current user is Moyuri or has Safe Contact flag
  const isSafeContactUser = currentUser?.id === 'PER-CITIZEN-MOYURI' || currentUser?.name?.includes('Moyuri');

  const handleOpenConfirm = () => {
    setError(null);
    setAlertSuccess(null);
    setIsOpen(true);
  };

  const handleCancel = () => {
    if (submitting) return;
    setIsOpen(false);
    setError(null);
  };

  const handleConfirmAlert = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        citizen_id: currentUser?.id || 'PER-CITIZEN-MOYURI',
        case_id: caseId || (currentUser?.id === 'PER-CITIZEN-MOYURI' ? 'CASE-20260901-0001' : null),
        application_id: applicationId || (currentUser?.id === 'PER-CITIZEN-MOYURI' ? 'APP-20260901-0001' : null),
        source_channel: currentView === 'representative-portal' ? 'REPRESENTATIVE_PORTAL' : (currentView === 'citizen-intake' ? 'CITIZEN_INTAKE' : 'CITIZEN_PORTAL'),
        danger_notes: language === 'bn' 
          ? 'জরুরি বিপদ সংকেত বোতামের মাধ্যমে নাগরিক অবিলম্বে ডিএলএও সহায়তা চেয়েছেন।'
          : 'Citizen requested urgent emergency safety assistance via Emergency Danger Alert button.'
      };

      const res = await api.sendEmergencyAlert(payload);
      setAlertSuccess(res.data);
    } catch (err) {
      console.error('Emergency alert submission failed:', err);
      setError(err.message || (language === 'bn' ? 'সংকেত পাঠাতে ত্রুটি হয়েছে। জরুরি পরিস্থিতিতে সরাসরি ৯৯৯ কল করুন।' : 'Failed to send alert. In immediate danger, call 999 directly.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside
      className="emergency-floating-widget"
      role="region"
      aria-label={language === 'bn' ? 'জরুরি বিপদ সংকেত ব্যবস্থা' : 'Emergency Danger Alert System'}
    >
      {/* 1. PERSISTENT TRIGGER BUTTON */}
      <button
        type="button"
        id="btn-emergency-danger-alert"
        className="btn-emergency-trigger"
        onClick={handleOpenConfirm}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="emergency-pulse-beacon" aria-hidden="true"></span>
        <IconAlertTriangle size={22} className="emergency-icon-svg" />
        <span className="emergency-trigger-text">
          {language === 'bn' ? 'জরুরি বিপদ সংকেত' : 'Emergency Alert'}
        </span>
      </button>

      {/* 4. MANDATORY HONEST DISCLAIMER — DIRECTLY BELOW BUTTON & VISIBLE BEFORE CLICK */}
      <div className="emergency-pre-click-disclaimer" id="emergency-mandatory-disclaimer">
        <span className="disclaimer-badge">
          {language === 'bn' ? '⚠️ সতর্কতা:' : '⚠️ Notice:'}
        </span>
        <p className="disclaimer-body-text">
          {language === 'bn'
            ? 'এটি ৯৯৯ বা পুলিশ জরুরি সেবা নয় — এটি DLAO অফিসারদের সতর্ক করে। জীবন-হুমকির পরিস্থিতিতে সরাসরি ৯৯৯ নম্বরে কল করুন।'
            : 'This is NOT 999 or police emergency services — it alerts DLAO officers. For life-threatening situations, call 999 directly.'}
        </p>
      </div>

      {/* 2. CONFIRMATION MODAL (Prevents Accidental Triggers) */}
      {isOpen && (
        <div
          className="emergency-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergency-modal-title"
          onClick={handleCancel}
        >
          <div
            className="emergency-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="emergency-modal-header">
              <div className="emergency-modal-icon-wrap">
                <IconAlertTriangle size={32} />
              </div>
              <div>
                <h3 id="emergency-modal-title" className="emergency-modal-title">
                  {language === 'bn' ? 'জরুরি বিপদ সংকেত নিশ্চিতকরণ' : 'Confirm Emergency Danger Alert'}
                </h3>
                <span className="emergency-modal-subtitle">
                  {language === 'bn' ? 'ডিএলএও কর্মকর্তাদের তাৎক্ষণিক সতর্কবার্তা' : 'Immediate DLAO Duty Officer Alert'}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="emergency-modal-body">
              {!alertSuccess ? (
                <>
                  <p className="emergency-confirm-prompt">
                    {language === 'bn'
                      ? 'আপনি কি নিশ্চিত? এটি DLAO কর্মকর্তা ও জরুরি হেল্পলাইন ডেস্ককে অবিলম্বে উচ্চ-অগ্রাধিকার সতর্কবার্তা পাঠাবে।'
                      : 'Are you sure? This will alert DLAO staff immediately with high-priority dispatch.'}
                  </p>

                  {/* Safe Contact Mode Guardrail Awareness Banner */}
                  {isSafeContactUser && (
                    <div className="safe-contact-protection-banner" role="status">
                      <div className="safe-icon-wrap">
                        <IconShield size={22} />
                      </div>
                      <div className="safe-text-wrap">
                        <strong>
                          {language === 'bn'
                            ? 'নিরাপদ যোগাযোগ সুরক্ষা মোড সক্রিয়'
                            : 'Safe Contact Protection Mode Active'}
                        </strong>
                        <p>
                          {language === 'bn'
                            ? 'আপনার ঝুঁকিপূর্ণ ফোন বা নম্বরে কোনো সরাসরি কল বা এসএমএস করা হবে না। আপনার মামলায় অনুমোদিত প্রতিনিধির মাধ্যমেই যোগাযোগ রক্ষিত হবে।'
                            : 'Unsafe phone/SMS channels are strictly restricted. DLAO officers will only contact via your designated authorized representative.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Immediate 999 Reminder */}
                  <div className="emergency-police-callout">
                    <IconPhone size={18} />
                    <span>
                      {language === 'bn'
                        ? 'সরাসরি শারীরিক আক্রমণের ঝুঁকিতে থাকলে সাথে সাথে ৯৯৯ কল করুন।'
                        : 'If facing immediate physical threat or violence, dial 999 directly.'}
                    </span>
                  </div>

                  {error && (
                    <div className="emergency-error-box" role="alert">
                      {error}
                    </div>
                  )}
                </>
              ) : (
                /* Success State */
                <div className="emergency-sent-success-box" role="status" id="emergency-success-message">
                  <div className="success-badge-icon">✓</div>
                  <h4>
                    {language === 'bn'
                      ? 'জরুরি বিপদ সংকেত সফলভাবে গৃহীত হয়েছে!'
                      : 'Emergency Alert Successfully Received!'}
                  </h4>
                  <p>
                    {language === 'bn'
                      ? `ডিএলএও জরুরি অফিসার ও দায়িত্বপ্রাপ্ত কর্মকর্তাদের সতর্ক করা হয়েছে। অ্যালার্ট রেফারেন্স: ${alertSuccess.alert_id}`
                      : `DLAO duty officer queue alerted. Reference ID: ${alertSuccess.alert_id}`}
                  </p>
                  {alertSuccess.safe_contact_active === 1 && (
                    <div className="safe-contact-confirmed-tag">
                      🛡️ {language === 'bn' ? 'নিরাপদ যোগাযোগ প্রোটোকল সুরক্ষিত' : 'Safe Contact Protocol Enforced'}
                    </div>
                  )}
                  <p className="sla-note">
                    ⏱️ {language === 'bn' ? '৫ মিনিটের জরুরি এসএলএ সময়সীমা নির্ধারিত হয়েছে।' : '5-minute urgent officer acknowledgement SLA active.'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="emergency-modal-footer">
              {!alertSuccess ? (
                <>
                  <button
                    type="button"
                    id="btn-emergency-cancel"
                    className="btn-emergency-secondary"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    id="btn-emergency-confirm"
                    className="btn-emergency-danger-cta"
                    onClick={handleConfirmAlert}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span>{language === 'bn' ? 'সংকেত পাঠানো হচ্ছে...' : 'Transmitting Alert...'}</span>
                    ) : (
                      <>
                        <IconAlertTriangle size={18} />
                        <span>{language === 'bn' ? 'হ্যাঁ, জরুরি সংকেত পাঠান' : 'Yes, Send Emergency Alert'}</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  id="btn-emergency-close-success"
                  className="btn-portal-primary"
                  onClick={() => setIsOpen(false)}
                >
                  {language === 'bn' ? 'ঠিক আছে' : 'Understood'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
