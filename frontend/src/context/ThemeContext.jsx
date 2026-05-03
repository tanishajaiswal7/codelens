import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { applyTheme, getCurrentTheme } from '../utils/themeUtils.js';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => getCurrentTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === 'codelens-theme' && event.newValue) {
        setThemeState(event.newValue === 'light' ? 'light' : 'dark');
      }
    };

    const handleThemeChanged = () => {
      setThemeState(getCurrentTheme());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('themeChanged', handleThemeChanged);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('themeChanged', handleThemeChanged);
    };
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (nextTheme) => setThemeState(nextTheme === 'light' ? 'light' : 'dark'),
      toggleTheme: () => setThemeState((current) => (current === 'light' ? 'dark' : 'light')),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};