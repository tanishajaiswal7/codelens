import { useState } from 'react';
import PropTypes from 'prop-types';
import SuggestionCard from '../SuggestionCard/SuggestionCard.jsx';
import ScoreStrip from '../ScoreStrip/ScoreStrip.jsx';
import ErrorCard from '../ErrorCard/ErrorCard.jsx';
import './ReviewPanel.css';

export default function ReviewPanel({
  review,
  previousReview,
  resolvedSuggestionIds,
  isLoading,
  error,
  onRetry,
}) {
  const [filter, setFilter] = useState('all');

  // Show error state if there's an error
  if (error) {
    return (
      <div className="review-panel">
        <div className="review-error">
          <ErrorCard 
            title="Review Failed"
            error={error}
            onRetry={onRetry}
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="review-panel">
        <div className="suggestions">
          {[1, 2, 3].map((i) => (
            <div key={`skeleton-${i}`} className="skeleton-card">
              <div className="skeleton-line title" />
              <div className="skeleton-line body w90" />
              <div className="skeleton-line body w75" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="review-panel">
        <div className="suggestions">
          <div className="review-empty">
            <div className="review-empty-text">No review yet</div>
            <div className="review-empty-subtext">Submit code on the left to get started</div>
          </div>
        </div>
      </div>
    );
  }

  const getVerdictClass = (verdict) => {
    const mapping = {
      approved: 'verdict-approved',
      needs_revision: 'verdict-needs',
      minor_issues: 'verdict-minor',
    };
    return mapping[verdict] || 'verdict-needs';
  };

  const getVerdictLabel = (verdict) => {
    const mapping = {
      approved: '✓ Approved',
      needs_revision: '✗ Needs Revision',
      minor_issues: '⚠ Minor Issues',
    };
    return mapping[verdict] || 'Review Complete';
  };

  let filteredSuggestions = review.suggestions;
  if (filter === 'high') {
    filteredSuggestions = review.suggestions.filter(
      (s) => s.confidence >= 85
    );
  } else if (filter === 'critical') {
    filteredSuggestions = review.suggestions.filter(
      (s) => s.severity === 'critical'
    );
  }

  return (
    <div className="review-panel">
      {previousReview && (
        <ScoreStrip
          previousCount={previousReview.suggestions.length}
          currentCount={review.suggestions.length}
        />
      )}

      <div className="verdict-strip">
        <div>
          <div className="verdict-title">Verdict</div>
          <div className="verdict-text">{review.summary}</div>
        </div>
        <div className={`verdict-badge ${getVerdictClass(review.verdict)}`}>
          {getVerdictLabel(review.verdict)}
        </div>
      </div>

      <div className="filter-bar">
        <span className="filter-label">Filter:</span>
        <button
          className={`chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({review.suggestions.length})
        </button>
        <button
          className={`chip ${filter === 'high' ? 'active' : ''}`}
          onClick={() => setFilter('high')}
        >
          High Confidence (
          {
            review.suggestions.filter((s) => s.confidence >= 85).length
          }
          )
        </button>
        <button
          className={`chip ${filter === 'critical' ? 'active' : ''}`}
          onClick={() => setFilter('critical')}
        >
          Critical (
          {review.suggestions.filter((s) => s.severity === 'critical').length}
          )
        </button>
      </div>

      {filteredSuggestions.length > 0 ? (
        <div className="suggestions">
          {resolvedSuggestionIds.map((id) => {
            const original = previousReview?.suggestions?.find((s) => s.id === id);
            if (!original) {
              return null;
            }

            return (
              <SuggestionCard
                key={`resolved-${id}`}
                suggestion={original}
                isResolved
              />
            );
          })}
          {filteredSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              isNew={suggestion.status === 'new'}
            />
          ))}
        </div>
      ) : (
        <div className="suggestions">
          <div className="review-empty">
            <div className="review-empty-text">No suggestions</div>
            <div className="review-empty-subtext">No suggestions match this filter</div>
          </div>
        </div>
      )}
    </div>
  );
}

ReviewPanel.propTypes = {
  review: PropTypes.shape({
    verdict: PropTypes.oneOf(['approved', 'needs_revision', 'minor_issues']).isRequired,
    summary: PropTypes.string.isRequired,
    suggestions: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        severity: PropTypes.oneOf(['critical', 'high', 'medium', 'low', 'info']).isRequired,
        confidence: PropTypes.number.isRequired,
      })
    ).isRequired,
  }),
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onRetry: PropTypes.func,
  previousReview: PropTypes.shape({
    suggestions: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
    })).isRequired,
  }),
  resolvedSuggestionIds: PropTypes.arrayOf(PropTypes.string),
};

ReviewPanel.defaultProps = {
  previousReview: null,
  resolvedSuggestionIds: [],
};
