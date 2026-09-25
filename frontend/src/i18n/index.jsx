import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './en.json';
import bn from './bn.json';

const translations = { en, bn };

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('adlasb_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('adlasb_lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'bn' : 'en'));
  };

  /**
   * Translate key with optional fallback and interpolation
   * e.g. t('app.title') or t('roles.B1_DLAO_OFFICER')
   */
  const t = (path, fallback = '') => {
    const keys = path.split('.');
    let current = translations[language];

    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback to English if missing in target
        let fallbackVal = translations.en;
        for (const fKey of keys) {
          if (fallbackVal && fallbackVal[fKey] !== undefined) {
            fallbackVal = fallbackVal[fKey];
          } else {
            fallbackVal = null;
            break;
          }
        }
        return fallbackVal !== null ? fallbackVal : (fallback || path);
      }
    }

    return current;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
