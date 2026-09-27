import React from 'react';
import { useLanguage } from '../i18n';

export default function StatStrip() {
  const { language } = useLanguage();

  const stats = [
    {
      valueBn: '৬৪ জেলা',
      valueEn: '64 Districts',
      labelBn: 'সারাদেশে আইনি সেবা নেটওয়ার্ক',
      labelEn: 'Nationwide Legal Aid Coverage'
    },
    {
      valueBn: '৭টি ভূমিকা',
      valueEn: '7 Roles',
      labelBn: 'সমন্বিত বিচার সেবা ইকোসিস্টেম',
      labelEn: 'Integrated Judicial Stakeholders'
    },
    {
      valueBn: '৫টি দৃশ্যকল্প',
      valueEn: '5 Scenarios',
      labelBn: 'সুরক্ষা ও দায়িত্বশীলতা রুট',
      labelEn: 'Citizen Protection Pathways'
    },
    {
      valueBn: '১০০% অডিট',
      valueEn: '100% Audit',
      labelBn: 'অপরিবর্তনীয় লগ ও সত্যতা ট্রেইল',
      labelEn: 'Immutable Provenance Ledger'
    },
    {
      valueBn: '১৬৬৯৯',
      valueEn: '16699',
      labelBn: 'টোল-ফ্রি জাতীয় আইনি হেল্পলাইন',
      labelEn: 'Toll-Free National Legal Helpline',
      isHelpline: true
    }
  ];

  return (
    <div className="gov-stat-strip" role="region" aria-label="System Scale Indicators">
      <div className="stat-strip-container">
        {stats.map((stat, idx) => (
          <div key={idx} className={`stat-item ${stat.isHelpline ? 'helpline-item' : ''}`}>
            <span className="stat-value">{language === 'bn' ? stat.valueBn : stat.valueEn}</span>
            <span className="stat-label">{language === 'bn' ? stat.labelBn : stat.labelEn}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
