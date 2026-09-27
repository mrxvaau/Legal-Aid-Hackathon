import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';

export default function AccessibilityToolbar({ isOpen, onClose }) {
  const { language } = useLanguage();
  const [fontSize, setFontSize] = useState('base'); // 'sm', 'base', 'lg', 'xl'
  const [contrastMode, setContrastMode] = useState('normal'); // 'normal', 'high', 'mono'
  const [linksHighlight, setLinksHighlight] = useState(false);
  const [readingGuide, setReadingGuide] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    // Font sizing
    root.classList.remove('font-sm', 'font-base', 'font-lg', 'font-xl');
    root.classList.add(`font-${fontSize}`);
  }, [fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('high-contrast', 'monochrome');
    if (contrastMode === 'high') root.classList.add('high-contrast');
    if (contrastMode === 'mono') root.classList.add('monochrome');
  }, [contrastMode]);

  useEffect(() => {
    const root = document.documentElement;
    if (linksHighlight) {
      root.classList.add('highlight-links');
    } else {
      root.classList.remove('highlight-links');
    }
  }, [linksHighlight]);

  useEffect(() => {
    const root = document.documentElement;
    if (readingGuide) {
      root.classList.add('reading-guide-active');
    } else {
      root.classList.remove('reading-guide-active');
    }
  }, [readingGuide]);

  const resetAll = () => {
    setFontSize('base');
    setContrastMode('normal');
    setLinksHighlight(false);
    setReadingGuide(false);
  };

  if (!isOpen) return null;

  return (
    <aside
      className="gov-accessibility-panel"
      role="region"
      aria-label={language === 'bn' ? 'সহজপ্রবেশ্যতা সরঞ্জাম' : 'Accessibility Toolbar'}
    >
      <div className="accessibility-panel-header">
        <div className="panel-title">
          <span className="panel-icon" aria-hidden="true">♿</span>
          <strong>{language === 'bn' ? 'সহজপ্রবেশ্যতা ও অন্তর্ভুক্তি সহায়ক' : 'Accessibility & Inclusion Panel'}</strong>
        </div>
        <button
          type="button"
          className="gov-panel-close-btn"
          onClick={onClose}
          aria-label={language === 'bn' ? 'প্যানেল বন্ধ করুন' : 'Close panel'}
        >
          ✕
        </button>
      </div>

      <div className="accessibility-panel-body">
        {/* Skip to Content */}
        <div className="accessibility-row">
          <a
            href="#main-content"
            className="gov-skip-link"
            onClick={onClose}
          >
            {language === 'bn' ? '⏩ মূল বিষয়বস্তুতে যান (Skip to Content)' : '⏩ Skip to Main Content'}
          </a>
        </div>

        {/* Font Size */}
        <div className="accessibility-group">
          <label className="group-label">
            {language === 'bn' ? 'ফন্ট সাইজ / লেখার আকার:' : 'Text Size Scaling:'}
          </label>
          <div className="accessibility-btn-group" role="group" aria-label="Font Size">
            <button
              type="button"
              className={`a11y-btn ${fontSize === 'sm' ? 'active' : ''}`}
              onClick={() => setFontSize('sm')}
              title="Small"
            >
              A-
            </button>
            <button
              type="button"
              className={`a11y-btn ${fontSize === 'base' ? 'active' : ''}`}
              onClick={() => setFontSize('base')}
              title="Default"
            >
              A
            </button>
            <button
              type="button"
              className={`a11y-btn ${fontSize === 'lg' ? 'active' : ''}`}
              onClick={() => setFontSize('lg')}
              title="Large"
            >
              A+
            </button>
            <button
              type="button"
              className={`a11y-btn ${fontSize === 'xl' ? 'active' : ''}`}
              onClick={() => setFontSize('xl')}
              title="Extra Large"
            >
              A++
            </button>
          </div>
        </div>

        {/* Contrast Modes */}
        <div className="accessibility-group">
          <label className="group-label">
            {language === 'bn' ? 'কনট্রাস্ট মোড / বৈসাদৃশ্য:' : 'Contrast & Visual Mode:'}
          </label>
          <div className="accessibility-btn-group" role="group" aria-label="Contrast Mode">
            <button
              type="button"
              className={`a11y-btn ${contrastMode === 'normal' ? 'active' : ''}`}
              onClick={() => setContrastMode('normal')}
            >
              {language === 'bn' ? 'স্বাভাবিক' : 'Standard'}
            </button>
            <button
              type="button"
              className={`a11y-btn ${contrastMode === 'high' ? 'active' : ''}`}
              onClick={() => setContrastMode('high')}
            >
              {language === 'bn' ? 'উচ্চ বৈসাদৃশ্য' : 'High Contrast'}
            </button>
            <button
              type="button"
              className={`a11y-btn ${contrastMode === 'mono' ? 'active' : ''}`}
              onClick={() => setContrastMode('mono')}
            >
              {language === 'bn' ? 'সাদা-কালো' : 'Monochrome'}
            </button>
          </div>
        </div>

        {/* Link / Focus Highlight */}
        <div className="accessibility-group">
          <label className="group-label">
            {language === 'bn' ? 'সংযোগ ও ফোকাস স্পষ্টকরণ:' : 'Focus & Link Highlighting:'}
          </label>
          <div className="accessibility-toggle-row">
            <button
              type="button"
              className={`a11y-btn toggle-btn ${linksHighlight ? 'active' : ''}`}
              onClick={() => setLinksHighlight(!linksHighlight)}
              aria-pressed={linksHighlight}
            >
              {linksHighlight
                ? (language === 'bn' ? '✓ লিংক হাইলাইট চালু' : '✓ Links Highlighted')
                : (language === 'bn' ? 'লিংক হাইলাইট বন্ধ' : 'Highlight Links')}
            </button>
            <button
              type="button"
              className={`a11y-btn toggle-btn ${readingGuide ? 'active' : ''}`}
              onClick={() => setReadingGuide(!readingGuide)}
              aria-pressed={readingGuide}
            >
              {readingGuide
                ? (language === 'bn' ? '✓ রিডিং গাইড চালু' : '✓ Reading Guide On')
                : (language === 'bn' ? 'রিডিং গাইড' : 'Reading Guide')}
            </button>
          </div>
        </div>

        {/* Reset button */}
        <div className="accessibility-footer">
          <button
            type="button"
            className="gov-reset-a11y-btn"
            onClick={resetAll}
          >
            {language === 'bn' ? 'সব পরিবর্তন মুছুন (Reset All)' : 'Reset All Settings'}
          </button>
        </div>
      </div>
    </aside>
  );
}
