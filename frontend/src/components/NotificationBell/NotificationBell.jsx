import { useState, useEffect } from 'react'
import axiosInstance from '../../utils/axiosInstance'
import './NotificationBell.css'

const typeMeta = {
  critical_issues_found: {
    icon: '!!',
    label: 'Critical',
    tone: 'critical'
  },
  pr_reviewed: {
    icon: 'PR',
    label: 'PR Reviewed',
    tone: 'reviewed'
  },
  member_joined: {
    icon: '+',
    label: 'Member Joined',
    tone: 'joined'
  }
}

function getTypeMeta(type) {
  return typeMeta[type] || {
    icon: 'i',
    label: 'Update',
    tone: 'default'
  }
}

function formatTime(dateValue) {
  const date = new Date(dateValue)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.max(1, Math.floor(diffMs / 60000))

  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDays = Math.floor(diffHr / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

export default function NotificationBell({ workspaceId }) {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!workspaceId) return
    fetchNotifications()

    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [workspaceId])

  const fetchNotifications = async () => {
    try {
      const data = await axiosInstance
        .get(`/api/notifications/${workspaceId}`)
        .then(r => r.data)
      setNotifications(data)
    } catch {
      // Fail silently
    }
  }

  const markRead = async (id) => {
    await axiosInstance.patch(`/api/notifications/${id}/read`)
    setNotifications(prev => prev.filter(n => n._id !== id))
  }

  const markAllRead = async () => {
    await Promise.all(
      notifications.map((n) => axiosInstance.patch(`/api/notifications/${n._id}/read`))
    )
    setNotifications([])
  }

  const unreadCount = notifications.length

  return (
    <div className="nb-container">
      <button
        className="nb-bell"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="nb-dropdown">
          <div className="nb-header">
            <div className="nb-header-meta">
              <span className="nb-title">Notifications</span>
              <span className="nb-subtitle">{unreadCount} unread</span>
            </div>

            <div className="nb-header-actions">
              {unreadCount > 0 && (
                <button
                  className="nb-mark-all"
                  onClick={markAllRead}
                >
                  Mark all
                </button>
              )}
              <button
                className="nb-close"
                onClick={() => setIsOpen(false)}
              >
                x
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="nb-empty">You are all caught up</div>
          ) : (
            notifications.map(n => (
              <div key={n._id} className="nb-item">
                <span className={`nb-icon nb-icon--${getTypeMeta(n.type).tone}`}>
                  {getTypeMeta(n.type).icon}
                </span>
                <div className="nb-content">
                  <span className={`nb-type nb-type--${getTypeMeta(n.type).tone}`}>
                    {getTypeMeta(n.type).label}
                  </span>
                  <p className="nb-message">{n.message}</p>
                  <span className="nb-time">
                    {formatTime(n.createdAt)}
                  </span>
                </div>
                <button
                  className="nb-dismiss"
                  onClick={() => markRead(n._id)}
                >
                  ✓
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}