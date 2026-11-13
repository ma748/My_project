import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle({ className = '', floating = false }) {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
        isDarkMode
          ? 'bg-slate-800/90 border-slate-700 text-slate-100 hover:bg-slate-700 hover:border-slate-600 shadow-sm'
          : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-sm'
      } ${floating ? 'theme-toggle--floating' : ''} ${className}`}
      title={isDarkMode ? 'Current theme: Dark. Click to switch to Light mode' : 'Current theme: Light. Click to switch to Dark mode'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className={`inline-flex items-center justify-center p-1 rounded-full transition-colors ${
        isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-amber-100 text-amber-600'
      }`}>
        {isDarkMode ? <Moon size={15} /> : <Sun size={15} />}
      </span>
      <span className="text-xs font-bold tracking-wide">
        {isDarkMode ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}
