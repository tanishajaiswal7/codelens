import './WorkspaceCard.css'
import { useNavigate } from 'react-router-dom'

export default function WorkspaceCard({ workspace, onOpen, onDelete }) {
  const navigate = useNavigate()
  const isOwner = workspace.role === 'owner' || workspace.userRole === 'owner'

  const planLabel = workspace.plan === 'pro' ? 'Pro' : 'Free'
  const memberCount = workspace.memberCount || 1
  const reviewCount = workspace.reviewCount || 0

  const createdDate = workspace.createdAt
    ? new Date(workspace.createdAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      })
    : null

  const colors = ['#6366f1','#8b5cf6','#ec4899','#10b981','#f59e0b','#3b82f6']
  const colorIndex = workspace.name ? workspace.name.charCodeAt(0) % colors.length : 0
  const accentColor = colors[colorIndex]

  return (
    <div className="wc" onClick={() => (onOpen ? onOpen() : navigate(`/workspace/${workspace._id || workspace.id}`))}>
      <div className="wc-accent-line" style={{ background: accentColor }} />

      <div className="wc-header">
        <div className="wc-avatar" style={{ background: accentColor + '22', borderColor: accentColor + '44' }}>
          <span style={{ color: accentColor }}>{workspace.name?.charAt(0)?.toUpperCase() || 'W'}</span>
        </div>

        <div className="wc-info">
          <div className="wc-name">{workspace.name}</div>
          <div className="wc-role">{isOwner ? 'You own this' : 'Member'}</div>
        </div>

        <div className="wc-badges">
          {isOwner && <span className="wc-badge wc-badge-owner">Owner</span>}
          <span className={`wc-badge ${planLabel === 'Pro' ? 'wc-badge-pro' : 'wc-badge-free'}`}>{planLabel}</span>
        </div>
      </div>

      <div className="wc-stats">
        <div className="wc-stat-item">
          <span className="wc-stat-icon">👥</span>
          <span className="wc-stat-text">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="wc-stat-dot" />
        <div className="wc-stat-item">
          <span className="wc-stat-icon">📋</span>
          <span className="wc-stat-text">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
        </div>
        {createdDate && (
          <>
            <div className="wc-stat-dot" />
            <div className="wc-stat-item"><span className="wc-stat-text">Created {createdDate}</span></div>
          </>
        )}
      </div>

      <div className="wc-footer">
        <button className="wc-open-btn" onClick={(e) => { e.stopPropagation(); onOpen ? onOpen() : navigate(`/workspace/${workspace._id || workspace.id}`) }}>
          Open →
        </button>
        {isOwner && (
          <button
            className="wc-delete-btn"
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`Delete "${workspace.name}"? This cannot be undone.`)) {
                onDelete && onDelete()
              }
            }}
            title="Delete workspace"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
