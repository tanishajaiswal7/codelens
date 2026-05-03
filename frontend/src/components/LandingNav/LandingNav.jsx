import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx';
import './LandingNav.css';

const NAV_LINKS = [
  { label: 'Features', target: 'features' },
  { label: 'For Teams', target: 'how-it-works' },
  { label: 'Pricing', target: 'pricing' },
  { label: 'Docs', target: 'personas' },
];

export default function LandingNav({ onNavigateSection }) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSectionClick = (target) => {
    setIsMobileMenuOpen(false);
    onNavigateSection(target);
  };

  return (
    <header className="landing-nav">
      <div className="landing-nav__inner">
        <button
          type="button"
          className="landing-nav__brand"
          onClick={() => navigate('/')}
          aria-label="CodeLens AI home"
        >
          <span className="landing-nav__mark" aria-hidden="true">CL</span>
          <span className="landing-nav__wordmark">
            Code<span>Lens</span> AI
          </span>
          <span className="landing-nav__beta">Beta</span>
        </button>

        <nav className="landing-nav__links" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <button
              key={link.target}
              type="button"
              className="landing-nav__link"
              onClick={() => handleSectionClick(link.target)}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="landing-nav__actions">
          <ThemeToggle />
          <button type="button" className="nav-btn" onClick={() => navigate('/login')}>
            Sign in
          </button>
          <button type="button" className="nav-btn nav-btn-primary" onClick={() => navigate('/register')}>
            Get started free
          </button>
        </div>

        <button
          type="button"
          className="landing-nav__menu-button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-expanded={isMobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="landing-nav__mobile-panel">
          <div className="landing-nav__mobile-links">
            {NAV_LINKS.map((link) => (
              <button
                key={link.target}
                type="button"
                className="nav-link"
                onClick={() => handleSectionClick(link.target)}
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="landing-nav__mobile-actions">
            <ThemeToggle />
            <button type="button" className="nav-btn" onClick={() => navigate('/login')}>
              Sign in
            </button>
            <button type="button" className="nav-btn nav-btn-primary" onClick={() => navigate('/register')}>
              Get started free
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

LandingNav.propTypes = {
  onNavigateSection: PropTypes.func.isRequired,
};