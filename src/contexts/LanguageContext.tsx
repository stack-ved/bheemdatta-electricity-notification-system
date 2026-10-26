import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Language } from '../translations';
import { TRANSLATIONS } from '../translations';


interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof TRANSLATIONS['en'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('bheemdatta_lang');
      if (saved === 'en' || saved === 'ne') return saved;
    } catch {
      // fallback
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('bheemdatta_lang', lang);
      document.documentElement.lang = lang === 'ne' ? 'ne' : 'en';
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ne' : 'en');
  };

  useEffect(() => {
    document.documentElement.lang = language === 'ne' ? 'ne' : 'en';
  }, [language]);

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t: TRANSLATIONS[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
