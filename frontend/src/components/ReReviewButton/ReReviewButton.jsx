import PropTypes from 'prop-types';
import './ReReviewButton.css';

export default function ReReViewButton({ onClick, isLoading, hasChanges, activeIssuesCount }) {
  // Show button only when:
  // 1. Code has been changed from the original
  // 2. There are active issues remaining (> 0) to check
  if (!hasChanges || activeIssuesCount === 0) {
    return null;
  }

  return (
    <button
      className={`re-review-btn ${isLoading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={isLoading}
      title="Verify that all issues have been fixed"
    >
      {isLoading ? (
        <>
          <span className="rrb-spinner" />
          Verifying...
        </>
      ) : (
        <>
          <span className="rrb-icon">✓</span>
          Check My Fix
        </>
      )}
    </button>
  );
}

ReReviewButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  hasChanges: PropTypes.bool.isRequired,
  activeIssuesCount: PropTypes.number,
};

ReReviewButton.defaultProps = {
  activeIssuesCount: 999, // Default to showing button (conservative)
};
