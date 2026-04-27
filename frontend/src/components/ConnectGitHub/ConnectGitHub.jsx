import { useState } from 'react';
import PropTypes from 'prop-types';
import * as githubApi from '../../api/githubApi.js';
import GitHubLoginButton from '../GitHubLoginButton/GitHubLoginButton.jsx';
import './ConnectGitHub.css';

/**
 * Connect GitHub Component
 * Allows users to connect via OAuth or Personal Access Token
 */
const ConnectGitHub = ({ onConnected }) => {
  const [activeTab, setActiveTab] = useState('oauth');
  const [pat, setPat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const validatePAT = (value) => {
    return value.startsWith('ghp_') && value.length >= 40;
  };

  const handleConnectPAT = async (e) => {
    e.preventDefault();
    
    if (!pat.trim()) {
      setError('Please enter a token');
      return;
    }

    if (!validatePAT(pat)) {
      setError('Invalid token format. Must start with ghp_ and be at least 40 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const result = await githubApi.connectPAT(pat);
      setSuccess({
        username: result.githubUsername,
        avatar: result.githubAvatar,
      });
      setPat('');
      
      // Call parent callback after a short delay
      setTimeout(() => {
        onConnected && onConnected(result);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to validate token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="connect-github">
      <div className="connect-tabs">
        <button
          className={`tab-button ${activeTab === 'oauth' ? 'active' : ''}`}
          onClick={() => setActiveTab('oauth')}
        >
          Connect via GitHub
        </button>
        <button
          className={`tab-button ${activeTab === 'pat' ? 'active' : ''}`}
          onClick={() => setActiveTab('pat')}
        >
          Use Personal Access Token
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'oauth' && (
          <div className="oauth-tab">
            <p className="tab-description">
              Click below to authorize CodeLens AI to read your repos and PRs
            </p>
            <GitHubLoginButton />
            <p className="security-note">
              ✓ We only read your code. We never push or modify anything.
            </p>
          </div>
        )}

        {activeTab === 'pat' && (
          <div className="pat-tab">
            <div className="pat-instructions">
              <p>
                Generate a Personal Access Token on GitHub with these scopes:
              </p>
              <ul>
                <li>
                  <strong>repo</strong> - Full control of private repos
                </li>
                <li>
                  <strong>read:user</strong> - Read your GitHub profile
                </li>
              </ul>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,read:user"
                target="_blank"
                rel="noopener noreferrer"
                className="create-token-link"
              >
                Create token on GitHub →
              </a>
            </div>

            <form onSubmit={handleConnectPAT} className="pat-form">
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={pat}
                onChange={(e) => {
                  setPat(e.target.value);
                  setError('');
                }}
                disabled={loading}
                className="pat-input"
              />

              {error && <div className="error-message">{error}</div>}
              {success && (
                <div className="success-card">
                  {success.avatar && (
                    <img
                      src={success.avatar}
                      alt={success.username}
                      className="success-avatar"
                    />
                  )}
                  <div>
                    <strong>@{success.username}</strong> connected!
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !pat.trim()}
                className="validate-button"
              >
                {loading ? 'Validating...' : 'Validate and Connect'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

ConnectGitHub.propTypes = {
  onConnected: PropTypes.func,
};

export default ConnectGitHub;
