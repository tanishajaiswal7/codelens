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

    review.files.forEach((file) => {
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
        <div>
          <h2>Review Results</h2>
          <p className="review-summary">{review.summary}</p>
        </div>
        <button
          className="copy-comment-button"
          onClick={handleCopyComment}
        >
          {copied ? '✓ Copied!' : 'Copy as GitHub comment'}
        </button>
      </div>

      <div className="files-review">
        {review.files.map((file) => (
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
                      <div key={idx} className="suggestion-wrapper">
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
                    No suggestions for this file
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="review-actions">
        {!hideBackButton && (
          <button className="back-button" onClick={onBack}>
            ← Back to PR list
          </button>
        )}
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
  }).isRequired,
  onBack: PropTypes.func.isRequired,
  hideBackButton: PropTypes.bool,
};
