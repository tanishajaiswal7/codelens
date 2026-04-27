import React from 'react';
import './StatCard.css';

const StatCard = ({ label, value, trend, trendValue }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <span className="trend-icon up">▲</span>;
      case 'down':
        return <span className="trend-icon down">▼</span>;
      default:
        return <span className="trend-icon neutral">—</span>;
    }
  };

  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-trend">
        {getTrendIcon()}
        {trendValue && <span className="trend-value">{trendValue}</span>}
      </div>
    </div>
  );
};

export default StatCard;