import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle({ className = '', floating = false }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const Icon = isDarkMode ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${floating ? 'theme-toggle--floating' : ''} ${className}`}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Icon size={18} />
      <span>{isDarkMode ? 'Light' : 'Dark'}</span>
    </button>
  );
}
