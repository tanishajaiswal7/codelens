import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as githubApi from '../../api/githubApi.js';
import './PRSelector.css';

/**
 * Pull Request Selector Component
 * Displays open PRs for a selected repository
 */
const PRSelector = ({ repoFullName, onPRSelect, onBack }) => {
  const [pulls, setPulls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPulls();
  }, [repoFullName]);

  const fetchPulls = async () => {
    setLoading(true);
    setError('');

    try {
      const [owner, repo] = repoFullName.split('/');
      const data = await githubApi.getPulls(owner, repo);
      setPulls(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch pull requests');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  if (loading) {
    return (
      <div className="pr-selector">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <div className="loading-state">Loading pull requests...</div>
      </div>
    );
  }

  return (
    <div className="pr-selector">
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>

      <div className="pr-header">
        <div className="pr-header-copy">
          <h2 className="repo-title">Open Pull Requests</h2>
          <p className="repo-subtitle">{repoFullName}</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {pulls.length === 0 ? (
        <div className="empty-state">No open pull requests in this repository</div>
      ) : (
        <div className="pulls-list">
          {pulls.map((pr) => (
            <article
              key={pr.number}
              className="pr-item"
              onClick={() =>
                onPRSelect(pr.number, pr.title, pr.url)
              }
            >
              <div className="pr-top">
                <div className="pr-title-section">
                  <h3 className="pr-title">#{pr.number} {pr.title}</h3>
                </div>
                <span className="pr-time">{formatDate(pr.createdAt)}</span>
              </div>

              <div className="pr-author-section">
                {pr.authorAvatar && (
                  <img
                    src={pr.authorAvatar}
                    alt={pr.author}
                    className="author-avatar"
                  />
                )}
                <span className="author-name">{pr.author}</span>
              </div>

              <div className="pr-stats">
                <span className="stat">
                  <strong>{pr.changedFilesCount}</strong> files
                </span>
                <span className="stat additions">
                  +{pr.additions}
                </span>
                <span className="stat deletions">
                  -{pr.deletions}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

PRSelector.propTypes = {
  repoFullName: PropTypes.string.isRequired,
  onPRSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default PRSelector;
