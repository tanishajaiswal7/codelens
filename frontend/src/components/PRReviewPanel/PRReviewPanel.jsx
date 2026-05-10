import { useState } from 'react';
import PropTypes from 'prop-types';
import SuggestionCard from '../SuggestionCard/SuggestionCard.jsx';
import ConfidenceBadge from '../ConfidenceBadge/ConfidenceBadge.jsx';
import './PRReviewPanel.css';

/**
 * PR Review Panel Component
 * Displays AI review results organized by file
 */
export default function PRReviewPanel({ review, onBack, hideBackButton = true }) {
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const files = review.files || [];
  const totalSuggestions = files.reduce(
    (count, file) => count + (file.suggestions?.length || 0),
    0
  );
  const hasCode = (review.codeLength || 0) > 0;
  const showCleanState = totalSuggestions === 0;

  const toggleFile = (filename) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const generateGitHubComment = () => {
    let comment = '## CodeLens AI Review\n\n';

    files.forEach((file) => {
      if (file.suggestions && file.suggestions.length > 0) {
        const highConfidence = file.suggestions.filter(
          (s) => s.confidence === 'high'
        );

        if (highConfidence.length > 0) {
          comment += `### ${file.filename}\n\n`;
          highConfidence.forEach((suggestion) => {
            comment += `- **${suggestion.category || 'Review'}** (Line ${suggestion.line || 'N/A'}): ${suggestion.suggestion}\n`;
          });
          comment += '\n';
        }
      }
    });

    return comment;
  };

  const handleCopyComment = () => {
    const comment = generateGitHubComment();
    navigator.clipboard.writeText(comment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pr-review-panel">
      <div className="review-header">
        <div className="review-header-left">
          {!hideBackButton && (
            <button
              className="back-button-header"
              onClick={onBack}
            >
              ← Back
            </button>
          )}
          <div>
            <h2>Review Results</h2>
            <p className="review-summary">{review.summary}</p>
          </div>
        </div>
        <button
          className="copy-comment-button"
          onClick={handleCopyComment}
        >
          {copied ? '✓ Copied!' : 'Copy as GitHub comment'}
        </button>
      </div>

      {showCleanState && (
        <div className={`review-status-banner ${hasCode ? 'review-status-banner--clean' : 'review-status-banner--warning'}`}>
          {hasCode
            ? 'No issues found — code looks clean!'
            : 'No reviewable code was fetched for this PR.'}
        </div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <div>Files reviewed: {review.filesReviewed?.join(', ') || files.map((file) => file.filename).join(', ') || 'n/a'}</div>
          <div>Code length: {review.codeLength || 0}</div>
        </div>
      )}

      <div className="files-review">
        {files.map((file) => (
          <div key={file.filename} className="file-review-section">
            <button
              className="file-review-header"
              onClick={() => toggleFile(file.filename)}
            >
              <span className="expand-icon">
                {expandedFiles.has(file.filename) ? '▼' : '▶'}
              </span>
              <span className="file-name">{file.filename}</span>
              <span className="suggestion-count">
                {file.suggestions ? file.suggestions.length : 0} suggestions
              </span>
            </button>

            {expandedFiles.has(file.filename) && (
              <div className="file-suggestions">
                {file.suggestions && file.suggestions.length > 0 ? (
                  <div className="suggestions-list">
                    {file.suggestions.map((suggestion, idx) => (
                      <div key={suggestion.id || idx} className="suggestion-wrapper">
                        <ConfidenceBadge
                          confidence={suggestion.confidence}
                        />
                        <SuggestionCard
                          suggestion={suggestion.suggestion}
                          line={suggestion.line}
                          category={suggestion.category}
                          showDetails={true}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-suggestions">
                    {hasCode ? 'No suggestions for this file' : 'No reviewable code was fetched for this file'}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

PRReviewPanel.propTypes = {
  review: PropTypes.shape({
    summary: PropTypes.string,
    files: PropTypes.arrayOf(
      PropTypes.shape({
        filename: PropTypes.string,
        suggestions: PropTypes.array,
      })
    ),
    filesReviewed: PropTypes.arrayOf(PropTypes.string),
    codeLength: PropTypes.number,
  }).isRequired,
  onBack: PropTypes.func.isRequired,
  hideBackButton: PropTypes.bool,
};
