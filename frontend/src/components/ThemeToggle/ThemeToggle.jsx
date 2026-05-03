import './ThemeToggle.css';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {theme === 'light' ? '☀' : '☾'}
      </span>
      <span className="theme-toggle__text">{theme === 'light' ? 'Light' : 'Dark'}</span>
    </button>
  );
}