import { useState } from 'react';
import PropTypes from 'prop-types';
import ConfidenceBadge from '../ConfidenceBadge/ConfidenceBadge.jsx';
import './SuggestionCard.css';

export default function SuggestionCard({ suggestion, isNew, isResolved }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSeverityClass = (severity) => {
    const mapping = {
      critical: 'sev-critical',
      high: 'sev-high',
      medium: 'sev-medium',
      low: 'sev-low',
      info: 'sev-info',
    };
    return mapping[severity] || 'sev-info';
  };

  return (
    <div className={`sug-card ${isNew ? 'is-new' : ''} ${isResolved ? 'is-resolved' : ''}`}>
      <div className="sug-top">
        <div className="sug-main">
          {(isNew || isResolved) && (
            <div className="sug-status-row">
              {isNew && <span className="sug-badge new">NEW</span>}
              {isResolved && <span className="sug-badge fixed">FIXED</span>}
            </div>
          )}
          <h3 className="sug-title">{suggestion.title}</h3>
          <div className="sug-meta">
            {suggestion.lineRef && (
              <span className="line-ref">
                L{suggestion.lineRef}
              </span>
            )}
            <span className={`sev-badge ${getSeverityClass(suggestion.severity)}`}>
              {suggestion.severity}
            </span>
            {suggestion.category && (
              <span className="suggestionCategory">{suggestion.category}</span>
            )}
          </div>
        </div>
        <div className="confidenceBadgeWrapper">
          <ConfidenceBadge
            score={suggestion.confidence}
            label={suggestion.confidenceLabel}
            band={suggestion.confidenceBand}
          />
        </div>
      </div>

      <div className="sug-desc">
        {suggestion.description}
      </div>

      <div className="sug-actions">
        <button
          className="act-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Hide' : 'Show reasoning'}
        </button>
      </div>

      {isExpanded && (
        <div className="sug-reasoning">
          {suggestion.confidenceReason}
        </div>
      )}
    </div>
  );
}

SuggestionCard.propTypes = {
  suggestion: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    lineRef: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    severity: PropTypes.oneOf(['critical', 'high', 'medium', 'low', 'info']).isRequired,
    confidence: PropTypes.number.isRequired,
    confidenceReason: PropTypes.string.isRequired,
    confidenceLabel: PropTypes.string,
    confidenceBand: PropTypes.string,
    category: PropTypes.string,
  }).isRequired,
  isNew: PropTypes.bool,
  isResolved: PropTypes.bool,
};

SuggestionCard.defaultProps = {
  isNew: false,
  isResolved: false,
};
