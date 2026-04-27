import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as githubApi from '../../api/githubApi.js';
import PersonaPicker from '../PersonaPicker/PersonaPicker.jsx';
import './PRFileSelector.css';

/**
 * PR File Selector Component
 * Allows user to select which files to review
 */
const PRFileSelector = ({
  owner,
  repo,
  prNumber,
  prTitle,
  prUrl,
  onBack,
  onReviewStart,
}) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [persona, setPersona] = useState('expert');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, [owner, repo, prNumber]);

  const fetchFiles = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await githubApi.getPullFiles(owner, repo, prNumber);
      setFiles(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch pull request files');
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (filename) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filename)) {
      newSelected.delete(filename);
    } else {
      newSelected.add(filename);
    }
    setSelectedFiles(newSelected);
  };

  const selectAll = () => {
    setSelectedFiles(new Set(files.map((f) => f.filename)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleReview = async () => {
    if (selectedFiles.size === 0) return;

    setReviewing(true);
    try {
      const result = await githubApi.reviewPR(
        owner,
        repo,
        prNumber,
        prTitle,
        prUrl,
        Array.from(selectedFiles),
        persona
      );
      onReviewStart(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start review');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="pr-file-selector">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <div className="loading-state">Loading files...</div>
      </div>
    );
  }

  return (
    <div className="pr-file-selector">
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>

      <div className="file-header">
        <h2>Select files to review</h2>
        <p className="file-count">
          {selectedFiles.size} of {files.length} selected
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {files.length === 0 ? (
        <div className="empty-state">No files changed in this PR</div>
      ) : (
        <>
          <div className="file-actions">
            <button className="action-button" onClick={selectAll}>
              Select all
            </button>
            <button className="action-button" onClick={deselectAll}>
              Deselect all
            </button>
          </div>

          <div className="files-list">
            {files.map((file) => (
              <div key={file.filename} className="file-item">
                <input
                  type="checkbox"
                  id={`file-${file.filename}`}
                  checked={selectedFiles.has(file.filename)}
                  onChange={() => toggleFile(file.filename)}
                  className="file-checkbox"
                />
                <label
                  htmlFor={`file-${file.filename}`}
                  className="file-label"
                >
                  <div className="file-name-section">
                    <span className="filename">{file.filename}</span>
                    <div className="file-badges">
                      <span className={`status-badge ${file.status}`}>
                        {file.status}
                      </span>
                      {file.isLargeFile && (
                        <span className="warning-badge">Large file</span>
                      )}
                    </div>
                  </div>
                  <div className="file-stats">
                    <span className="additions">+{file.additions}</span>
                    <span className="deletions">−{file.deletions}</span>
                  </div>
                </label>
              </div>
            ))}
          </div>

          <div className="reviewer-section">
            <h3>Review style</h3>
            <PersonaPicker
              value={persona}
              onChange={setPersona}
              showLabel={false}
            />
          </div>

          <button
            className="review-button"
            disabled={selectedFiles.size === 0 || reviewing}
            onClick={handleReview}
          >
            {reviewing
              ? 'Generating review...'
              : `Review ${selectedFiles.size} file${
                  selectedFiles.size === 1 ? '' : 's'
                }`}
          </button>
        </>
      )}
    </div>
  );
};

PRFileSelector.propTypes = {
  owner: PropTypes.string.isRequired,
  repo: PropTypes.string.isRequired,
  prNumber: PropTypes.number.isRequired,
  prTitle: PropTypes.string.isRequired,
  prUrl: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
  onReviewStart: PropTypes.func.isRequired,
};

export default PRFileSelector;
