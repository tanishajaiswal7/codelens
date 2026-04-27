import PropTypes from 'prop-types';
import './ScoreStrip.css';

export default function ScoreStrip({ previousCount, currentCount }) {
  const diff = currentCount - previousCount;
  const improved = diff < 0;
  const regressed = diff > 0;

  return (
    <div className="score-strip">
      <span className="ss-label">Previous review</span>
      <span className="ss-count prev">
        {previousCount} issue{previousCount !== 1 ? 's' : ''}
      </span>
      <span className="ss-arrow">→</span>
      <span className={`ss-count current ${improved ? 'improved' : regressed ? 'regressed' : ''}`}>
        {currentCount} issue{currentCount !== 1 ? 's' : ''}
      </span>
      {diff !== 0 && (
        <span className={`ss-delta ${improved ? 'improved' : 'regressed'}`}>
          {improved ? `${Math.abs(diff)} fixed` : `${diff} new`}
        </span>
      )}
    </div>
  );
}

ScoreStrip.propTypes = {
  previousCount: PropTypes.number.isRequired,
  currentCount: PropTypes.number.isRequired,
};
