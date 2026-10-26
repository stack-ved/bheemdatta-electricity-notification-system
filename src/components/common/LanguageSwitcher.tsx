import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Languages } from 'lucide-react';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact = false }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language Switcher"
      className="inline-flex items-center rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs backdrop-blur-xs"
    >
      {!compact && (
        <span className="hidden sm:flex pl-1.5 pr-1 text-slate-400 dark:text-slate-500">
          <Languages className="w-3.5 h-3.5" />
        </span>
      )}
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all duration-150 active:scale-95 cursor-pointer ${
          language === 'en'
            ? 'bg-white dark:bg-slate-700 text-blue-900 dark:text-amber-300 shadow-xs'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <span className="text-slate-300 dark:text-slate-600 text-xs px-0.5 select-none">|</span>
      <button
        type="button"
        onClick={() => setLanguage('ne')}
        className={`px-2.5 py-1 text-xs font-bold rounded-lg font-sans transition-all duration-150 active:scale-95 cursor-pointer ${
          language === 'ne'
            ? 'bg-white dark:bg-slate-700 text-blue-900 dark:text-amber-300 shadow-xs'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
        aria-pressed={language === 'ne'}
      >
        ने
      </button>
    </div>
  );
};
