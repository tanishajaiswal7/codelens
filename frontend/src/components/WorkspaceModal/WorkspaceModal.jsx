import { useState, useEffect } from 'react'
import './WorkspaceModal.css'

export function CreateWorkspaceModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Workspace name is required')
      return
    }
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await onCreate(name.trim())
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create workspace')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="wm-overlay" onClick={onClose}>
      <div className="wm-modal" onClick={e => e.stopPropagation()}>
        <div className="wm-header">
          <div className="wm-title">Create workspace</div>
          <button className="wm-close" onClick={onClose}>✕</button>
        </div>
        <div className="wm-body">
          <div className="wm-field">
            <label className="wm-label">Workspace name</label>
            <input
              className="wm-input"
              type="text"
              placeholder="e.g. My Team, Capstone Project..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
              maxLength={50}
            />
            {error && (
              <span className="wm-error">{error}</span>
            )}
          </div>
          <div className="wm-info">
            Members can be invited after creation via a
            shareable invite link.
          </div>
        </div>
        <div className="wm-footer">
          <button className="wm-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="wm-submit-btn"
            onClick={handleSubmit}
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? 'Creating...' : 'Create workspace'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function JoinWorkspaceModal({ onClose, onJoin }) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Invite code is required')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await onJoin(code.trim())
      onClose()
    } catch (err) {
      setError(err.message || 'Invalid invite code')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="wm-overlay" onClick={onClose}>
      <div className="wm-modal" onClick={e => e.stopPropagation()}>
        <div className="wm-header">
          <div className="wm-title">Join workspace</div>
          <button className="wm-close" onClick={onClose}>✕</button>
        </div>
        <div className="wm-body">
          <div className="wm-field">
            <label className="wm-label">Invite code or link</label>
            <input
              className="wm-input"
              type="text"
              placeholder="Paste your invite code here..."
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            {error && (
              <span className="wm-error">{error}</span>
            )}
          </div>
          <div className="wm-info">
            Ask your team admin for the invite link or code.
          </div>
        </div>
        <div className="wm-footer">
          <button className="wm-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="wm-submit-btn"
            onClick={handleSubmit}
            disabled={isLoading || !code.trim()}
          >
            {isLoading ? 'Joining...' : 'Join workspace'}
          </button>
        </div>
      </div>
    </div>
  )
}
