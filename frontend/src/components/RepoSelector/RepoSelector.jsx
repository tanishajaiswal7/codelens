import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as githubApi from '../../api/githubApi.js';
import ConnectGitHub from '../ConnectGitHub/ConnectGitHub.jsx';
import './RepoSelector.css';

/**
 * Repository Selector Component
 * Displays user's GitHub repositories with search and pagination
 * Allows users to browse files or view PRs for each repo
 */
const RepoSelector = ({ onRepoSelect, onBrowseFiles }) => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [notConnected, setNotConnected] = useState(false);

  useEffect(() => {
    fetchRepos(1);
  }, []);

  const fetchRepos = async (page) => {
    setLoading(true);
    setError('');
    setNotConnected(false);

    try {
      const data = await githubApi.getRepos(page);
      setRepos(data);
      setCurrentPage(page);
    } catch (err) {
      const errorCode = err.response?.data?.code;
      if (errorCode === 'GITHUB_NOT_CONNECTED') {
        setNotConnected(true);
      } else if (errorCode === 'GITHUB_TOKEN_INVALID') {
        setError('GitHub token expired. Please reconnect.');
      } else {
        setError(err.response?.data?.error || 'Failed to fetch repositories');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(search.toLowerCase())
  );

  if (notConnected) {
    return (
      <div className="repo-selector">
        <div className="not-connected-message">
          <h3>Connect GitHub Account</h3>
          <p>You need to connect your GitHub account to import PRs or browse files.</p>
          <ConnectGitHub onConnected={() => fetchRepos(1)} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="repo-selector">
        <div className="loading-state">Loading repositories...</div>
      </div>
    );
  }

  return (
    <div className="repo-selector">
      {error && <div className="error-message">{error}</div>}

      <div className="search-container">
        <input
          type="text"
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {filteredRepos.length === 0 ? (
        <div className="empty-state">
          {search ? 'No repositories match your search' : 'No repositories found'}
        </div>
      ) : (
        <div className="repos-list">
          {filteredRepos.map((repo) => (
            <div key={repo.id} className="repo-card">
              <div className="repo-card-top">
                <div className="repo-card-info">
                  <div className="repo-name-section">
                    <h3 className="repo-name">{repo.name}</h3>
                    <div className="repo-badges-section">
                      {repo.language && (
                        <span className="repo-lang-badge">{repo.language}</span>
                      )}
                      {repo.private && (
                        <span className="repo-private-badge">🔒 Private</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="repo-card-meta">
                  <span className={
                    repo.openPRCount > 0
                      ? "repo-pr-count"
                      : "repo-pr-count dimmed"
                  }>
                    {repo.openPRCount > 0
                      ? `${repo.openPRCount} open PR${repo.openPRCount > 1 ? 's' : ''}`
                      : 'No open PRs'}
                  </span>
                </div>
              </div>

              <div className="repo-card-actions">
                <button
                  className="repo-action-btn"
                  onClick={() => onBrowseFiles && onBrowseFiles(repo.owner, repo.name)}
                >
                  📁 Browse Files
                </button>
                <button
                  className={`repo-action-btn primary ${repo.openPRCount === 0 ? 'disabled' : ''}`}
                  onClick={() => {
                    if (repo.openPRCount > 0 && onRepoSelect) {
                      onRepoSelect(repo.fullName);
                    }
                  }}
                  disabled={repo.openPRCount === 0}
                >
                  🔀 View PRs
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {repos.length > 0 && (
        <div className="pagination">
          <button
            onClick={() => fetchRepos(currentPage + 1)}
            className="load-more-button"
          >
            Load more repositories
          </button>
        </div>
      )}
    </div>
  );
};

RepoSelector.propTypes = {
  onRepoSelect: PropTypes.func,
  onBrowseFiles: PropTypes.func,
};

export default RepoSelector;
