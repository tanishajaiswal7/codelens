import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import HistoryItem from '../HistoryItem/HistoryItem.jsx';
import RateLimitBar from '../RateLimitBar/RateLimitBar.jsx';
import { historyApi } from '../../api/historyApi.js';
import './Sidebar.css';

export default function Sidebar({ 
  onReviewSelect, 
  rateLimitUsed = 0,
  rateLimitTotal = 20,
  refreshKey = 0,
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await historyApi.getHistory();
        setHistory(response.history || []);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch history:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [refreshKey]);

  const handleSelectReview = (reviewId) => {
    onReviewSelect(reviewId);
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await historyApi.deleteReview(reviewId);
      setHistory(history.filter((item) => item.reviewId !== reviewId));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to delete review:', error);
      }
    }
  };

  const handleNavigateToSettings = () => {
    navigate('/settings');
  };

  const handleNavigateToWorkspaces = () => {
    navigate('/workspace');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-nav-wrapper">
        <button className="sidebar-nav-item active" onClick={() => navigate('/dashboard')} type="button">
          <span>🆕</span> New Review
        </button>
        <button className="sidebar-nav-item" onClick={handleNavigateToWorkspaces}>
          <span>👥</span> Workspace
        </button>
        <button className="sidebar-nav-item" onClick={handleNavigateToSettings}>
          <span>⚙️</span> Settings
        </button>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-title">Review History</h3>
        
        {loading ? (
          <div className="history-loading">Loading...</div>
        ) : history.length === 0 ? (
          <div className="history-empty">
            No reviews yet. Create your first review!
          </div>
        ) : (
          <div className="history-list">
            {history.slice(0, 5).map((item) => (
              <HistoryItem
                key={item.reviewId}
                item={item}
                onSelect={handleSelectReview}
                onDelete={handleDeleteReview}
              />
            ))}
          </div>
        )}
      </div>

      <RateLimitBar used={rateLimitUsed} limit={rateLimitTotal} />
    </aside>
  );
}

Sidebar.propTypes = {
  onReviewSelect: PropTypes.func.isRequired,
  rateLimitUsed: PropTypes.number,
  rateLimitTotal: PropTypes.number,
  refreshKey: PropTypes.number,
};
