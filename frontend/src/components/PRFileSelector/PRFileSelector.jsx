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
  repoFullName,
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
  const [persona, setPersona] = useState('faang');
  const [reviewing, setReviewing] = useState(false);
  const [resolvedOwner, resolvedRepo] = (owner && repo)
    ? [owner, repo]
    : (repoFullName || '').split('/');

  useEffect(() => {
    fetchFiles();
  }, [resolvedOwner, resolvedRepo, prNumber]);

  const fetchFiles = async () => {
    setLoading(true);
    setError('');

    try {
      if (!resolvedOwner || !resolvedRepo || !prNumber) {
        setError('Repository or PR information is missing. Please go back and open the PR again.');
        setFiles([]);
        return;
      }

      const data = await githubApi.getPullFiles(resolvedOwner, resolvedRepo, prNumber);
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
      const selectedFilesData = files.filter((file) => selectedFiles.has(file.filename));

      const result = await githubApi.reviewPR(
        resolvedOwner,
        resolvedRepo,
        prNumber,
        prTitle,
        prUrl,
        Array.from(selectedFiles),
        persona,
        selectedFilesData
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

      {files.length === 0 && !error ? (
        <div className="empty-state">No files changed in this PR</div>
      ) : (
        <>
          <div className="file-actions">
            <button className="action-button" onClick={selectAll} type="button">
              Select all
            </button>
            <button className="action-button" onClick={deselectAll} type="button">
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
              selectedPersona={persona}
              onPersonaChange={setPersona}
              compact={true}
            />
          </div>

          <button
            className="review-button"
            disabled={selectedFiles.size === 0 || reviewing}
            onClick={handleReview}
            type="button"
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
  repoFullName: PropTypes.string,
  prNumber: PropTypes.number.isRequired,
  prTitle: PropTypes.string.isRequired,
  prUrl: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
  onReviewStart: PropTypes.func.isRequired,
};

export default PRFileSelector;
