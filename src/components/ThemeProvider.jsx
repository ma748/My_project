import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

function getInitialTheme() {
  try {
    const savedTheme = localStorage.getItem('theme') || localStorage.getItem('officeTheme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
  } catch (e) {
    // Ignore localStorage access errors
  }

  try {
    if (window.matchMedia?.('(prefers-color-scheme: light)')?.matches) {
      return 'light';
    }
  } catch (e) {
    // Ignore matchMedia access errors
  }

  return 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    try {
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      localStorage.setItem('theme', theme);
      localStorage.setItem('officeTheme', theme);
    } catch (e) {
      // Ignore localStorage write errors
    }
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    isDarkMode: theme === 'dark',
    toggleTheme: () => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark'),
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    return {
      theme: 'dark',
      isDarkMode: true,
      toggleTheme: () => {}
    };
  }

  return context;
}
