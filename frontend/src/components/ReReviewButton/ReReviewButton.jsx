import PropTypes from 'prop-types';
import './ReReviewButton.css';

export default function ReReviewButton({ onClick, isLoading, hasChanges }) {
  if (!hasChanges) {
    return null;
  }

  return (
    <button
      className={`re-review-btn ${isLoading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={isLoading}
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
};
