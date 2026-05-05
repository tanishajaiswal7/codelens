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
  onReReview,
  isReReviewing,
  reReviewMeta,
  originalCode,
  isHistoryView,
  onSuggestionClick,
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

  // Separate resolved from active suggestions for re-review
  const resolvedSuggestions = reReviewMeta
    ? previousReview?.suggestions?.filter((s) => resolvedSuggestionIds.includes(s.id)) || []
    : [];
  
  const activeSuggestions = review.suggestions.filter(
    (s) => s.status !== 'resolved' && s.status !== 'unchanged'
  );

  let filteredSuggestions = activeSuggestions;
  if (filter === 'high') {
    filteredSuggestions = activeSuggestions.filter(
      (s) => s.confidence >= 85
    );
  } else if (filter === 'critical') {
    filteredSuggestions = activeSuggestions.filter(
      (s) => s.severity === 'critical'
    );
  }

  return (
    <div className="review-panel">
      {reReviewMeta && (
        <div className="rr-summary">
          <span className="rr-stat resolved">
            ✓ {reReviewMeta.resolved} resolved
          </span>
          <span className="rr-stat new">
            + {reReviewMeta.newCount} new
          </span>
          <span className="rr-stat persistent">
            ⚠ {reReviewMeta.persistent} persistent
          </span>
        </div>
      )}

      {previousReview && (
        <ScoreStrip
          previousCount={previousReview.suggestions.length}
          currentCount={activeSuggestions.length}
        />
      )}

      {/* header actions intentionally left empty - Re-Review Changes button removed */}

      <div className="verdict-strip">
        <div>
          <div className="verdict-title">
            {isHistoryView ? (
              <>
                <span>Past Review</span>
                <span className="past-review-badge">read only</span>
              </>
            ) : (
              <span>Verdict</span>
            )}
          </div>
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
          All ({activeSuggestions.length})
        </button>
        <button
          className={`chip ${filter === 'high' ? 'active' : ''}`}
          onClick={() => setFilter('high')}
        >
          High Confidence (
          {
            activeSuggestions.filter((s) => s.confidence >= 85).length
          }
          )
        </button>
        <button
          className={`chip ${filter === 'critical' ? 'active' : ''}`}
          onClick={() => setFilter('critical')}
        >
          Critical (
          {activeSuggestions.filter((s) => s.severity === 'critical').length}
          )
        </button>
      </div>

      {/* Show resolved section first if re-review */}
      {reReviewMeta && resolvedSuggestions.length > 0 && (
        <div className="resolved-section">
          <div className="resolved-header">
            <span className="resolved-count">✓ {resolvedSuggestions.length} Fixed</span>
          </div>
          <div className="resolved-list">
            {resolvedSuggestions.map((suggestion) => (
              <SuggestionCard
                key={`resolved-${suggestion.id}`}
                suggestion={suggestion}
                isResolved
                onLineRefClick={onSuggestionClick}
              />
            ))}
          </div>
        </div>
      )}

      {filteredSuggestions.length > 0 ? (
        <div className="suggestions">
          {filteredSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              isNew={suggestion.status === 'new'}
              onLineRefClick={onSuggestionClick}
            />
          ))}
        </div>
      ) : (
        <div className="suggestions">
          <div className="review-empty">
            <div className="review-empty-text">No suggestions</div>
            <div className="review-empty-subtext">
              {reReviewMeta && resolvedSuggestions.length > 0
                ? 'All issues have been resolved!'
                : 'No suggestions match this filter'}
            </div>
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
  onReReview: PropTypes.func,
  isReReviewing: PropTypes.bool,
  reReviewMeta: PropTypes.shape({
    resolved: PropTypes.number.isRequired,
    newCount: PropTypes.number.isRequired,
    persistent: PropTypes.number.isRequired,
  }),
  originalCode: PropTypes.string,
  previousReview: PropTypes.shape({
    suggestions: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
    })).isRequired,
  }),
  resolvedSuggestionIds: PropTypes.arrayOf(PropTypes.string),
  isHistoryView: PropTypes.bool,
  onSuggestionClick: PropTypes.func,
};

ReviewPanel.defaultProps = {
  previousReview: null,
  resolvedSuggestionIds: [],
  onReReview: null,
  isReReviewing: false,
  reReviewMeta: null,
  originalCode: null,
  isHistoryView: false,
  onSuggestionClick: null,
};
