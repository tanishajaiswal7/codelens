import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../../components/Topbar/Topbar.jsx';
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute.jsx';
import ConnectGitHub from '../../components/ConnectGitHub/ConnectGitHub.jsx';
import * as githubApi from '../../api/githubApi.js';
import { authApi } from '../../api/authApi.js';
import { settingsApi } from '../../api/settingsApi.js';
import { applyTheme, dispatchThemeChangeEvent } from '../../utils/themeUtils.js';
import './SettingsPage.css';

function SettingsContent({ user }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [gitHubStatus, setGitHubStatus] = useState(null);
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [editingEmail, setEditingEmail] = useState(user?.email || '');
  const [emailUpdateError, setEmailUpdateError] = useState('');
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState('');
  const [emailUpdating, setEmailUpdating] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    theme: 'dark',
    defaultPersona: 'faang',
    preferredLanguage: 'javascript',
    emailNotifications: { enabled: false, frequency: 'daily' },
  });

  const effectiveGitHubConnected = Boolean(
    gitHubStatus?.connected || user?.githubId || user?.githubUsername
  );
  const effectiveGitHubUsername = gitHubStatus?.username || user?.githubUsername || user?.name || 'GitHub User';
  const effectiveGitHubAvatar = gitHubStatus?.avatar || user?.githubAvatar || null;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await settingsApi.getSettings();
        const data = response.data.settings;
        setSettings(data);
        setFormData({
          theme: data.theme || 'dark',
          defaultPersona: data.defaultPersona || 'faang',
          preferredLanguage: data.preferredLanguage || 'javascript',
          emailNotifications: data.emailNotifications || { enabled: false, frequency: 'daily' },
        });

        // Fetch GitHub status
        try {
          const status = await githubApi.getGitHubStatus();
          setGitHubStatus(status);
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch GitHub status:', err);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch settings:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user.email]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('emailNotifications.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        emailNotifications: {
          ...formData.emailNotifications,
          [field]: type === 'checkbox' ? checked : value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaveError('');

      // Save settings to backend first
      await settingsApi.updateSettings(formData);
      
      // Apply theme immediately (this saves to localStorage)
      applyTheme(formData.theme);
      
      // Store other preferences in localStorage
      localStorage.setItem('codelens-default-persona', formData.defaultPersona);
      localStorage.setItem('codelens-preferred-language', formData.preferredLanguage);
      localStorage.setItem('codelens-email-notifications', JSON.stringify(formData.emailNotifications));
      
      // Dispatch event to notify other components of theme change
      dispatchThemeChangeEvent();
      
      setSaved(true);
      
      // Wait a moment for theme to apply, then navigate
      setTimeout(() => {
        navigate('/dashboard');
      }, 300);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save profile/settings.';
      setSaveError(message);
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to save settings:', error);
      }
    }
  };

  const handleEmailEditCancel = () => {
    setEmailEditMode(false);
    setEditingEmail(user?.email || '');
    setEmailUpdateError('');
    setEmailUpdateSuccess('');
  };

  const handleEmailUpdate = async () => {
    if (!editingEmail.trim()) {
      setEmailUpdateError('Email cannot be empty');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editingEmail)) {
      setEmailUpdateError('Please enter a valid email address');
      return;
    }

    if (editingEmail === user?.email) {
      setEmailUpdateError('Please enter a different email address');
      return;
    }

    setEmailUpdating(true);
    setEmailUpdateError('');
    setEmailUpdateSuccess('');

    try {
      const response = await authApi.updateProfile({ email: editingEmail });
      setEmailUpdateSuccess('Email updated successfully. You can now log in with your new email.');
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: response.data.user,
      }));
      setEmailEditMode(false);
      // Optionally navigate back to dashboard or refresh
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update email. Please try again.';
      setEmailUpdateError(errorMessage);
    } finally {
      setEmailUpdating(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      await githubApi.disconnect();
      setGitHubStatus({
        connected: false,
        username: null,
        avatar: null,
        method: null,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to disconnect GitHub:', error);
      }
    }
  };

  if (loading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings-page">
      <Topbar user={user} showBackButton={true} />

      <div className="settings-container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Customize your CodeLens AI experience</p>
        </div>

        <div className="settings-content">
          <div className="settings-grid">
          {/* Account Section */}
          <section className="settings-section">
            <h2>Account</h2>
            <div className="setting-item">
              <label>Name</label>
              <p className="setting-display-value">{user?.name}</p>
              <p className="setting-description">Managed from your account identity</p>
            </div>

            <div className="setting-item">
              <label>Email</label>
              {!emailEditMode ? (
                <>
                  <p className="setting-display-value">{user?.email}</p>
                  <p className="setting-description">Used for login and account recovery</p>
                  {user?.githubId ? (
                    <div className="setting-github-locked">
                      <p className="setting-github-locked-message">
                        🔒 Email is managed by GitHub. Disconnect GitHub to change email.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="setting-edit-button"
                      onClick={() => setEmailEditMode(true)}
                    >
                      Change Email
                    </button>
                  )}
                </>
              ) : (
                <div className="setting-edit-form">
                  <input
                    type="email"
                    value={editingEmail}
                    onChange={(e) => {
                      setEditingEmail(e.target.value);
                      setEmailUpdateError('');
                    }}
                    placeholder="Enter new email"
                    className="setting-edit-input"
                    disabled={emailUpdating}
                  />
                  <div className="setting-edit-actions">
                    <button
                      type="button"
                      className="setting-edit-save-button"
                      onClick={handleEmailUpdate}
                      disabled={emailUpdating}
                    >
                      {emailUpdating ? 'Updating...' : 'Update'}
                    </button>
                    <button
                      type="button"
                      className="setting-edit-cancel-button"
                      onClick={handleEmailEditCancel}
                      disabled={emailUpdating}
                    >
                      Cancel
                    </button>
                  </div>
                  {emailUpdateError && (
                    <p className="setting-error-message">{emailUpdateError}</p>
                  )}
                  {emailUpdateSuccess && (
                    <p className="setting-success-message">{emailUpdateSuccess}</p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Theme Section */}
          <section className="settings-section">
            <h2>Appearance</h2>
            <div className="setting-item">
              <label htmlFor="theme">Theme</label>
              <select
                id="theme"
                name="theme"
                value={formData.theme}
                onChange={handleChange}
                className="setting-select"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
              <p className="setting-description">Choose your preferred color scheme</p>
            </div>
          </section>

          {/* Default Persona Section */}
          <section className="settings-section">
            <h2>Code Review Preferences</h2>
            <div className="setting-item">
              <label htmlFor="defaultPersona">Default Persona</label>
              <select
                id="defaultPersona"
                name="defaultPersona"
                value={formData.defaultPersona}
                onChange={handleChange}
                className="setting-select"
              >
                <option value="faang">FAANG SWE</option>
                <option value="startup">Startup Founder</option>
                <option value="security">Security Auditor</option>
              </select>
              <p className="setting-description">Default persona for code reviews</p>
            </div>

            <div className="setting-item">
              <label htmlFor="preferredLanguage">Code Language Preference</label>
              <select
                id="preferredLanguage"
                name="preferredLanguage"
                value={formData.preferredLanguage}
                onChange={handleChange}
                className="setting-select"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
              <p className="setting-description">Preferred language in code editor</p>
            </div>
          </section>

          {/* Email Notifications Section */}
          <section className="settings-section">
            <h2>Notifications</h2>
            <div className="setting-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="emailNotifications.enabled"
                  checked={formData.emailNotifications.enabled}
                  onChange={handleChange}
                  className="setting-checkbox"
                />
                <span>Enable Email Notifications</span>
              </label>
              <p className="setting-description">Receive email updates about your reviews</p>
            </div>

            {formData.emailNotifications.enabled && (
              <div className="setting-item">
                <label htmlFor="frequency">Notification Frequency</label>
                <select
                  id="frequency"
                  name="emailNotifications.frequency"
                  value={formData.emailNotifications.frequency}
                  onChange={handleChange}
                  className="setting-select"
                >
                  <option value="immediate">Immediate</option>
                  <option value="daily">Daily Digest</option>
                  <option value="weekly">Weekly Summary</option>
                </select>
                <p className="setting-description">How often to receive notifications</p>
              </div>
            )}
          </section>

          {/* GitHub Integration Section */}
          <section className="settings-section">
            <h2>GitHub Integration</h2>
            {effectiveGitHubConnected ? (
              <div className="github-connected-card">
                {effectiveGitHubAvatar && (
                  <img
                    src={effectiveGitHubAvatar}
                    alt={effectiveGitHubUsername}
                    className="github-avatar"
                  />
                )}
                <div className="github-info">
                  <p className="github-username">@{effectiveGitHubUsername}</p>
                  <p className="github-status">Connected</p>
                </div>
                <button
                  className="github-disconnect-button"
                  onClick={handleDisconnectGitHub}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <ConnectGitHub onConnected={() => {
                try {
                  githubApi.getGitHubStatus().then(setGitHubStatus);
                } catch (err) {
                  if (process.env.NODE_ENV === 'development') {
                    console.error('Failed to fetch GitHub status:', err);
                  }
                }
              }} />
            )}
          </section>
        </div>
        </div>

        {/* Save Button */}
        <div className="settings-footer">
          <button className="save-button" onClick={handleSave}>
            Save Preferences
          </button>
          {saved && <p className="saved-message">✓ Settings saved successfully!</p>}
          {saveError && <p className="save-error-message">{saveError}</p>}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      {(user) => <SettingsContent user={user} />}
    </ProtectedRoute>
  );
}
