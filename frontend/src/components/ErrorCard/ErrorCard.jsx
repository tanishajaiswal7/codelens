import PropTypes from 'prop-types';
import './ErrorCard.css';

/**
 * Error Card Component
 * Displays error messages with retry functionality
 */
export default function ErrorCard({ error, onRetry, title = 'Error' }) {
  return (
    <div className="error-card">
      <div className="error-content">
        <div className="error-title">{title}</div>
        <div className="error-msg">
          {error || 'Something went wrong. Please try again.'}
        </div>
      </div>
      {onRetry && (
        <button className="error-retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

ErrorCard.propTypes = {
  error: PropTypes.string,
  onRetry: PropTypes.func,
  title: PropTypes.string,
};
