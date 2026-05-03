import PropTypes from 'prop-types';
import { useState } from 'react';
import './HistoryItem.css';

export default function HistoryItem({ 
  item, 
  onSelect, 
  onDelete 
}) {
  const [isClicking, setIsClicking] = useState(false);

  const handleClick = async () => {
    setIsClicking(true);
    try {
      await onSelect(item.reviewId);
    } finally {
      setIsClicking(false);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const personaColors = {
    faang: '#4f46e5',
    startup: '#f59e0b',
    security: '#ef4444',
  };

  return (
    <div 
      className={`history-item ${isClicking ? 'hist-card-loading' : ''}`}
      onClick={handleClick}
    >
      <div className="history-item-header">
        <div className="history-item-code">
          <code>{item.codeSnippet}</code>
        </div>
        <button
          className="history-item-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.reviewId);
          }}
          title="Delete review"
          disabled={isClicking}
        >
          ✕
        </button>
      </div>

      <div className="history-item-meta">
        <span
          className={`history-item-persona history-persona-${item.persona}`}
        >
          {item.persona.toUpperCase()}
        </span>
        <span className="history-item-time">{formatTimeAgo(item.createdAt)}</span>
        {isClicking && (
          <div className="hist-card-spinner"/>
        )}
      </div>
    </div>
  );
}

HistoryItem.propTypes = {
  item: PropTypes.shape({
    reviewId: PropTypes.string.isRequired,
    codeSnippet: PropTypes.string.isRequired,
    persona: PropTypes.oneOf(['faang', 'startup', 'security']).isRequired,
    createdAt: PropTypes.string.isRequired,
    verdict: PropTypes.oneOf(['approved', 'needs_revision', 'minor_issues']),
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
