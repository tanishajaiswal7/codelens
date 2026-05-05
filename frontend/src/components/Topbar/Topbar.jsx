import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi.js';

import ProfileCard from '../ProfileCard/ProfileCard.jsx';
import {
  GettingStartedModal,
  GuidesModal,
  APIReferenceModal,
  FAQModal,
  SupportModal
} from '../HelpModals';
import './Topbar.css';

export default function Topbar({ user, showBackButton = false, onBack, onSidebarToggle }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(user);
  const [docsOpen, setDocsOpen] = useState(false);
  const [gettingStartedOpen, setGettingStartedOpen] = useState(false);
  const [guidesOpen, setGuidesOpen] = useState(false);
  const [apiRefOpen, setApiRefOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [profileCardOpen, setProfileCardOpen] = useState(false);
  const docsRef = useRef(null);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  useEffect(() => {
    const handleProfileUpdate = (event) => {
      if (event.detail) {
        setCurrentUser((prev) => ({ ...prev, ...event.detail }));
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (docsRef.current && !docsRef.current.contains(event.target)) {
        setDocsOpen(false);
      }
    };

    if (docsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [docsOpen]);



  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Logout failed:', error);
      }
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleAvatarClick = () => {
    setProfileCardOpen(true);
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        {!showBackButton && (
          <button 
            className="topbar-hamburger"
            onClick={onSidebarToggle}
            title="Toggle sidebar"
          >
            ☰
          </button>
        )}
        {showBackButton && (
          <button 
            className="topbar-back-btn"
            onClick={handleBackClick}
            title="Go back"
          >
            ←
          </button>
        )}
        <a href="/" className="logo-link">
          <div className="logo-mark">◆</div>
          <div className="logo-name">Code<em>Lens</em></div>
          <div className="logo-beta">Beta</div>
        </a>
      </div>

      <div className="topbar-nav">
        {/* Nav items can be added here if needed in future */}
      </div>

      <div className="topbar-right">
        <button 
          className="topbar-btn topbar-btn-workspaces"
          onClick={() => navigate('/workspace')}
          title="Go to Workspaces"
        >
          👥 Workspaces
        </button>

        <div className="docs-menu-container" ref={docsRef}>
          <button 
            className="topbar-btn"
            onClick={() => setDocsOpen(!docsOpen)}
          >
            📚 Docs
          </button>
          {docsOpen && (
            <div className="docs-dropdown">
              <button 
                className="docs-item"
                onClick={() => {
                  setGettingStartedOpen(true);
                  setDocsOpen(false);
                }}
              >
                <span className="docs-icon">📖</span>
                <div className="docs-content">
                  <div className="docs-title">Getting Started</div>
                  <div className="docs-desc">Learn the basics</div>
                </div>
              </button>
              <button 
                className="docs-item"
                onClick={() => {
                  setGuidesOpen(true);
                  setDocsOpen(false);
                }}
              >
                <span className="docs-icon">🎯</span>
                <div className="docs-content">
                  <div className="docs-title">Guides</div>
                  <div className="docs-desc">How-to guides & tutorials</div>
                </div>
              </button>
              <button 
                className="docs-item"
                onClick={() => {
                  setApiRefOpen(true);
                  setDocsOpen(false);
                }}
              >
                <span className="docs-icon">⚙️</span>
                <div className="docs-content">
                  <div className="docs-title">API Reference</div>
                  <div className="docs-desc">Complete API docs</div>
                </div>
              </button>
              <button 
                className="docs-item"
                onClick={() => {
                  setFaqOpen(true);
                  setDocsOpen(false);
                }}
              >
                <span className="docs-icon">❓</span>
                <div className="docs-content">
                  <div className="docs-title">FAQ</div>
                  <div className="docs-desc">Common questions</div>
                </div>
              </button>
              <hr className="docs-divider" />
              <button 
                className="docs-item"
                onClick={() => {
                  setSupportOpen(true);
                  setDocsOpen(false);
                }}
              >
                <span className="docs-icon">💬</span>
                <div className="docs-content">
                  <div className="docs-title">Support</div>
                  <div className="docs-desc">Get help from team</div>
                </div>
              </button>
            </div>
          )}
        </div>
        <button className="topbar-btn topbar-btn-upgrade">
          ⬆ Upgrade
        </button>
        <button className="topbar-avatar-button" onClick={handleAvatarClick} title="Open profile settings">
          {currentUser?.avatarUrl ? (
            <img
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${currentUser.avatarUrl}`}
              alt={currentUser?.name || 'Profile avatar'}
              className="topbar-avatar-image"
            />
          ) : (
            <div className="topbar-avatar">{getInitials(currentUser?.name || 'U')}</div>
          )}
        </button>
        <button className="topbar-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Help Modals */}
      <GettingStartedModal 
        isOpen={gettingStartedOpen} 
        onClose={() => setGettingStartedOpen(false)} 
      />
      <GuidesModal 
        isOpen={guidesOpen} 
        onClose={() => setGuidesOpen(false)} 
      />
      <APIReferenceModal 
        isOpen={apiRefOpen} 
        onClose={() => setApiRefOpen(false)} 
      />
      <FAQModal 
        isOpen={faqOpen} 
        onClose={() => setFaqOpen(false)} 
      />
      <SupportModal 
        isOpen={supportOpen} 
        onClose={() => setSupportOpen(false)} 
      />
      <ProfileCard
        isOpen={profileCardOpen}
        onClose={() => setProfileCardOpen(false)}
        user={currentUser}
      />
    </div>
  );
}

Topbar.propTypes = {
  user: PropTypes.object,
  showBackButton: PropTypes.bool,
  onBack: PropTypes.func,
  onSidebarToggle: PropTypes.func,
};
