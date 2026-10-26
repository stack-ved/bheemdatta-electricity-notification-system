import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs transition-all duration-200 active:scale-90 cursor-pointer focus-visible:outline-hidden"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-90 hover:scale-110" />
      ) : (
        <Moon className="w-4 h-4 text-blue-900 transition-transform duration-300 hover:-rotate-45 hover:scale-110" />
      )}
    </button>
  );
};
