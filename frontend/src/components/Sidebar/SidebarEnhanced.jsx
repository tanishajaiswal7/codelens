import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import HistoryItem from '../HistoryItem/HistoryItem.jsx';
import RateLimitBar from '../RateLimitBar/RateLimitBar.jsx';
import { historyApi } from '../../api/historyApi.js';
import './SidebarEnhanced.css';

export default function SidebarEnhanced({ 
  onReviewSelect, 
  onNewReview,
  rateLimitUsed = 0,
  rateLimitTotal = 20,
  refreshKey = 0,
  sidebarWidth = 340,
}) {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonaFilter, setSelectedPersonaFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const navigate = useNavigate();

  // Fetch history on mount
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

  // Apply search and filters
  useEffect(() => {
    let filtered = history;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.codeSnippet.toLowerCase().includes(query)
      );
    }

    // Persona filter
    if (selectedPersonaFilter !== 'all') {
      filtered = filtered.filter(item => item.persona === selectedPersonaFilter);
    }

    // Sorting
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      // Exclude any reviews created within the last 24 hours when showing oldest
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours in ms
      filtered = filtered.filter(item => new Date(item.createdAt).getTime() < cutoff);
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    setFilteredHistory(filtered);
  }, [history, searchQuery, selectedPersonaFilter, sortBy]);

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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPersonaFilter('all');
    setSortBy('recent');
  };

  const hasActiveFilters = searchQuery || selectedPersonaFilter !== 'all' || sortBy !== 'recent';

  return (
    <aside className="sidebar-enhanced" style={{ '--sidebar-width': `${sidebarWidth}px` }}>
      <div className="sidebar-nav-wrapper">
        <button
          className="sidebar-nav-item active"
          onClick={onNewReview}
          title="Create new review"
          type="button"
        >
          <span>🆕</span> New Review
        </button>
        <button
          className="sidebar-nav-item"
          onClick={handleNavigateToWorkspaces}
          title="Go to workspaces"
          type="button"
        >
          <span>👥</span> Workspace
        </button>
        <button 
          className="sidebar-nav-item" 
          onClick={handleNavigateToSettings}
          title="Go to settings"
          type="button"
        >
          <span>⚙️</span> Settings
        </button>
      </div>

      <div className="sidebar-section">
        <div className="section-header">
          <h3 className="sidebar-title">Review History</h3>
          <span className="review-count" title="Total reviews">{history.length}</span>
        </div>

        {/* Search Box */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Search reviews"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="filters-wrapper">
          <div className="filter-group">
            <label className="filter-label">Persona:</label>
            <select
              value={selectedPersonaFilter}
              onChange={(e) => setSelectedPersonaFilter(e.target.value)}
              className="filter-select"
              aria-label="Filter by persona"
            >
              <option value="all">All</option>
              <option value="faang">FAANG SWE</option>
              <option value="startup">Startup</option>
              <option value="security">Security</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
              aria-label="Sort by"
            >
              <option value="recent">Recent</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              className="filter-clear"
              onClick={clearFilters}
              title="Clear all filters"
              aria-label="Clear all filters"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* History List */}
        {loading ? (
          <div className="history-loading">
            <div className="skeleton-loader"></div>
            <div className="skeleton-loader"></div>
            <div className="skeleton-loader"></div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="history-empty">
            <div className="empty-icon">📭</div>
            <p className="empty-title">
              {history.length === 0 ? 'No reviews yet' : 'No results found'}
            </p>
            <p className="empty-subtitle">
              {history.length === 0 
                ? 'Create your first code review to get started!'
                : 'Try adjusting your search or filters'}
            </p>
            {hasActiveFilters && (
              <button
                className="empty-action"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="history-list">
            {filteredHistory.map((item) => (
              <HistoryItem
                key={item.reviewId}
                item={item}
                onSelect={handleSelectReview}
                onDelete={handleDeleteReview}
              />
            ))}
            {filteredHistory.length < history.length && (
              <p className="results-info">
                Showing {filteredHistory.length} of {history.length} reviews
              </p>
            )}
          </div>
        )}
      </div>

      <RateLimitBar used={rateLimitUsed} limit={rateLimitTotal} />
    </aside>
  );
}

SidebarEnhanced.propTypes = {
  onReviewSelect: PropTypes.func.isRequired,
  onNewReview: PropTypes.func,
  rateLimitUsed: PropTypes.number,
  rateLimitTotal: PropTypes.number,
  refreshKey: PropTypes.number,
  sidebarWidth: PropTypes.number,
};

SidebarEnhanced.defaultProps = {
  onNewReview: () => {},
};
