/**
 * Theme Utility
 * Centralized theme management to ensure consistent theme application across all pages
 */

export const applyTheme = (theme) => {
  // Ensure theme is valid
  const validTheme = theme === 'light' ? 'light' : 'dark';
  
  // Save to localStorage immediately
  localStorage.setItem('codelens-theme', validTheme);
  
  // Apply to document root
  const root = document.documentElement;
  const body = document.body;
  
  if (!root) return;
  
  root.setAttribute('data-theme', validTheme);
  // Do not force inline styles here. Let CSS variables defined in stylesheets
  // drive the appearance for both light and dark themes. This avoids
  // conflicts where inline styles override component-level styling and
  // produces inconsistent UX in the light theme.
  // Force a reflow so CSS changes take effect immediately.
  void root.offsetHeight;
};

/**
 * Get current theme from localStorage
 */
export const getCurrentTheme = () => {
  return localStorage.getItem('codelens-theme') || 'dark';
};

/**
 * Dispatch theme change event to notify all listeners
 */
export const dispatchThemeChangeEvent = () => {
  window.dispatchEvent(new Event('themeChanged'));
  // Also dispatch storage event for cross-tab updates
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'codelens-theme',
      newValue: localStorage.getItem('codelens-theme'),
    })
  );
};

/**
 * Initialize theme on app load
 */
export const initializeTheme = () => {
  const theme = getCurrentTheme();
  applyTheme(theme);
};
