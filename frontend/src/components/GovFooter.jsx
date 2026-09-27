import React from 'react';
import { useLanguage } from '../i18n';
import { useRole } from '../hooks/useRole';

export default function GovFooter({ backendHealth }) {
  const { language } = useLanguage();
  const { activeRole } = useRole();

  return (
    <footer className="gov-official-footer" role="contentinfo">
      {/* Top Footer: Institutional Metadata */}
      <div className="footer-top-band">
        <div className="footer-inner-container">
          <div className="footer-col-gov">
            <div className="footer-emblem-row">
              <span className="footer-emblem-icon">⚖️</span>
              <div>
                <h4 className="footer-gov-title">
                  {language === 'bn'
                    ? 'জাতীয় আইনগত সহায়তা প্রদান সংস্থা (NLASO)'
                    : 'National Legal Aid Services Organization (NLASO)'}
                </h4>
                <p className="footer-gov-sub">
                  {language === 'bn'
                    ? 'আইন ও বিচার বিভাগ | আইন, বিচার ও সংসদ বিষয়ক মন্ত্রণালয়, গণপ্রজাতন্ত্রী বাংলাদেশ সরকার'
                    : 'Law and Justice Division | Ministry of Law, Justice and Parliamentary Affairs, Bangladesh'}
                </p>
              </div>
            </div>
            <p className="footer-statutory-note">
              {language === 'bn'
                ? 'আইনগত সহায়তা প্রদান আইন, ২০০০-এর অধীনে পরিচালিত সরকারি বিনামূল্যে আইনি পরামর্শ, সালিশ ও আইনজীবী সহায়তা ব্যবস্থা।'
                : 'Statutory free legal assistance, mediation, and panel lawyer assignment under the Legal Aid Services Act, 2000.'}
            </p>
          </div>

          <div className="footer-col-helpline">
            <h5 className="footer-section-title">
              {language === 'bn' ? 'জরুরি আইনি সহায়তা ও যোগাযোগ' : 'Emergency & Legal Assistance'}
            </h5>
            <div className="footer-helpline-box">
              <div className="helpline-badge">
                <span className="hl-number">১৬৬৯৯</span>
                <span className="hl-text">{language === 'bn' ? 'জাতীয় লিগ্যাল এইড (টোল-ফ্রি)' : 'National Legal Aid (Toll-Free)'}</span>
              </div>
              <div className="helpline-badge alt">
                <span className="hl-number">৯৯৯</span>
                <span className="hl-text">{language === 'bn' ? 'জাতীয় জরুরি পুলিশ সেবা' : 'National Emergency Services'}</span>
              </div>
            </div>
          </div>

          <div className="footer-col-system">
            <h5 className="footer-section-title">
              {language === 'bn' ? 'সিস্টেম স্ট্যাটাস ও তথ্য' : 'System Integrity & Status'}
            </h5>
            <ul className="footer-status-list">
              <li>
                <span className={`status-dot ${backendHealth === 'UP' ? 'online' : 'offline'}`} />
                <span>API: <strong>{backendHealth === 'UP' ? 'Connected (Port 5000)' : 'Checking/Offline'}</strong></span>
              </li>
              <li>
                <span>{language === 'bn' ? 'বর্তমান সেশন পদবী:' : 'Active Role:'} <strong>{activeRole.code}</strong></span>
              </li>
              <li>
                <span>{language === 'bn' ? 'অডিট ট্রেইল:' : 'Audit Trail:'} <strong>SHA-256 Immutable</strong></span>
              </li>
              <li>
                <span>{language === 'bn' ? 'সর্বশেষ হালনাগাদ:' : 'Last Updated:'} <strong>২৭ সেপ্টেম্বর ২০২৬</strong></span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Copyright & Official Links */}
      <div className="footer-bottom-band">
        <div className="footer-inner-container bottom-row">
          <p className="copyright-text">
            © ২০২৬ গণপ্রজাতন্ত্রী বাংলাদেশ সরকার | ADLASB v1.5.0-Release | All Rights Reserved.
          </p>
          <div className="footer-links">
            <button type="button" className="footer-link-btn">{language === 'bn' ? 'ব্যবহারের নির্দেশিকা' : 'User Guide'}</button>
            <span>|</span>
            <button type="button" className="footer-link-btn">{language === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}</button>
            <span>|</span>
            <button type="button" className="footer-link-btn">{language === 'bn' ? 'নিরাপত্তা প্রটোকল' : 'Security Protocols'}</button>
            <span>|</span>
            <button type="button" className="footer-link-btn">{language === 'bn' ? 'অভিযোগ ও পরামর্শ' : 'Grievance / Feedback'}</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
