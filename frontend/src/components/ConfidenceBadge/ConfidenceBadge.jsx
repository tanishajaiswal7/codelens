import PropTypes from 'prop-types';
import './ConfidenceBadge.css';

export default function ConfidenceBadge({ score, label, band }) {
  const bandColor = band || 'green';
  const fillPercentage = Math.min(100, Math.max(0, score));

  const getScoreClass = () => {
    switch (bandColor) {
      case 'amber':
        return 'moderate';
      case 'orange':
        return 'low';
      case 'red':
        return 'speculative';
      default:
        return 'high';
    }
  };

  const getFillClass = () => {
    switch (bandColor) {
      case 'amber':
        return 'moderate';
      case 'orange':
        return 'low';
      case 'red':
        return 'speculative';
      default:
        return 'high';
    }
  };

  return (
    <div className="conf-badge">
      <div className={`conf-score ${getScoreClass()}`}>
        {score}
      </div>
      <div className="conf-bar-wrap">
        <div
          className={`conf-bar ${getFillClass()}`}
          style={{ width: `${fillPercentage}%` }}
        />
      </div>
      <div className="conf-label">
        {label}
      </div>
    </div>
  );
}

ConfidenceBadge.propTypes = {
  score: PropTypes.number.isRequired,
  label: PropTypes.string,
  band: PropTypes.oneOf(['green', 'amber', 'orange', 'red']),
};
