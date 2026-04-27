import PropTypes from 'prop-types';
import './RateLimitBar.css';

export default function RateLimitBar({ used = 0, limit = 20 }) {
  const percentage = (used / limit) * 100;
  
  let barColor = 'high';
  if (percentage > 75) {
    barColor = 'low';
  } else if (percentage > 50) {
    barColor = 'medium';
  }

  return (
    <div className="rate-card">
      <div className="rate-label">
        {used} / {limit} reviews
      </div>
      <div className="rate-bar-wrap">
        <div
          className={`rate-fill ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="rate-text">
        {limit - used} remaining
      </div>
    </div>
  );
}

RateLimitBar.propTypes = {
  used: PropTypes.number,
  limit: PropTypes.number,
};
