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
  
  // Apply inline styles with !important to override any existing styles
  if (validTheme === 'light') {
    root.style.setProperty('background-color', '#ffffff', 'important');
    root.style.setProperty('color', '#1a1a1a', 'important');
    if (body) {
      body.style.setProperty('background-color', '#ffffff', 'important');
      body.style.setProperty('color', '#1a1a1a', 'important');
    }
  } else {
    root.style.setProperty('background-color', '#0f0f1a', 'important');
    root.style.setProperty('color', '#f0eff8', 'important');
    if (body) {
      body.style.setProperty('background-color', '#0f0f1a', 'important');
      body.style.setProperty('color', '#f0eff8', 'important');
    }
  }
  
  // Force browser to recalculate styles
  if (root.offsetHeight !== undefined) {
    void root.offsetHeight;
  }
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
