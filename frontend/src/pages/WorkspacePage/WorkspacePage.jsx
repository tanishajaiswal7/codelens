import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../../components/Topbar/Topbar.jsx';
import Sidebar from '../../components/Sidebar/Sidebar.jsx';
import WorkspaceCard from '../../components/WorkspaceCard/WorkspaceCard.jsx';
import { CreateWorkspaceModal, JoinWorkspaceModal } from '../../components/WorkspaceModal/WorkspaceModal.jsx';
import { workspaceApi } from '../../api/workspaceApi.js';
import './WorkspacePage.css';

export default function WorkspacePage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const bodyRef = useRef(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await workspaceApi.getMyWorkspaces();
      // normalize to an array of workspace objects that include role
      const list = (data.workspaces || []).map(item => ({
        ...(item.workspace || item),
        role: item.role || item.roleName || item.workspace?.role || 'member'
      }));
      setWorkspaces(list);
    } catch (err) {
      setError(err.message || 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  useEffect(() => {
    if (!isResizingSidebar) return undefined;

    const handleMouseMove = (event) => {
      if (!bodyRef.current) return;

      const rect = bodyRef.current.getBoundingClientRect();
      if (rect.width === 0) return;

      const nextWidth = event.clientX - rect.left;
      const maxWidth = Math.max(220, rect.width - 360);
      const clamped = Math.min(maxWidth, Math.max(180, nextWidth));
      setSidebarWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar]);

  const handleSidebarResizerKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setSidebarWidth((prev) => Math.max(180, prev - 16));
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setSidebarWidth((prev) => Math.min(420, prev + 16));
    }
  };

  const handleCreate = async (name) => {
    setIsCreating(true);
    setError(null);
    try {
      const data = await workspaceApi.createWorkspace(name);
      const id = data.workspace?._id || data.workspace?.id;
      if (id) {
        navigate(`/workspace/${id}`);
      } else {
        // fallback: refresh list
        await fetchWorkspaces();
      }
    } catch (err) {
      setError(err.message || 'Failed to create workspace');
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (code) => {
    setError(null);
    try {
      const data = await workspaceApi.acceptInvite(code);
      const id = data.workspace?._id || data.workspace?.id || data._id || data.id;
      if (id) navigate(`/workspace/${id}`);
      else await fetchWorkspaces();
    } catch (err) {
      setError(err.message || 'Failed to join workspace');
      throw err;
    }
  };

  const handleOpen = (workspace) => {
    const id = workspace._id || workspace.id;
    if (id) navigate(`/workspace/${id}`);
  };

  const handleDelete = async (workspaceId) => {
    const confirmed = window.confirm('Delete this workspace? This cannot be undone.');
    if (!confirmed) return;
    try {
      setDeletingWorkspaceId(workspaceId);
      await workspaceApi.deleteWorkspace(workspaceId);
      setWorkspaces(prev => prev.filter(w => (w._id || w.id) !== workspaceId));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to delete workspace');
    } finally {
      setDeletingWorkspaceId(null);
    }
  };

  function CreateWorkspaceCard({ onClick }) {
    return (
      <div className="wc-create" onClick={onClick}>
        <div className="wc-create-icon">+</div>
        <div className="wc-create-label">New workspace</div>
        <div className="wc-create-sub">Create a shared space for your team</div>
      </div>
    );
  }

  function EmptyWorkspaceState({ onCreate }) {
    return (
      <div className="wp-empty">
        <div className="wp-empty-icon">🏗</div>
        <div className="wp-empty-title">No workspaces yet</div>
        <div className="wp-empty-text">
          Create a workspace to collaborate with your team on code reviews. Invite members with a link.
        </div>
        <button className="wp-create-btn" onClick={onCreate}>+ Create your first workspace</button>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <Topbar />
      <div className="wp-body" ref={bodyRef} style={{ '--sidebar-width': `${sidebarWidth}px` }}>
        <Sidebar activeNav="workspaces" sidebarWidth={sidebarWidth} />
        <div
          className="wp-sidebar-resizer"
          role="separator"
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          aria-valuemin={180}
          aria-valuemax={420}
          aria-valuenow={Math.round(sidebarWidth)}
          tabIndex={0}
          onMouseDown={() => setIsResizingSidebar(true)}
          onKeyDown={handleSidebarResizerKeyDown}
        />

        <div className="wp-main">
          <div className="wp-page-header">
            <div className="wp-page-header-left">
              <h1 className="wp-page-title">Workspaces</h1>
              <p className="wp-page-sub">Collaborate with your team on code reviews</p>
            </div>
            <div className="wp-page-header-right">
              <button className="wp-join-btn" onClick={() => setShowJoinModal(true)}>Join with invite</button>
              <button className="wp-create-btn" onClick={() => setShowCreateModal(true)}>+ New workspace</button>
            </div>
          </div>

          <div className="wp-stats-strip">
            <div className="wp-stat">
              <span className="wp-stat-value">{workspaces.length}</span>
              <span className="wp-stat-label">Workspaces</span>
            </div>
            <div className="wp-stat-divider" />
            <div className="wp-stat">
              <span className="wp-stat-value">{workspaces.filter(w => (w.role === 'owner' || w.userRole === 'owner')).length}</span>
              <span className="wp-stat-label">Owned</span>
            </div>
            <div className="wp-stat-divider" />
            <div className="wp-stat">
              <span className="wp-stat-value">{workspaces.reduce((s, w) => s + (w.memberCount || 1), 0)}</span>
              <span className="wp-stat-label">Total members</span>
            </div>
          </div>

          {isLoading ? (
            <div className="loading">Loading workspaces...</div>
          ) : workspaces.length === 0 ? (
            <EmptyWorkspaceState onCreate={() => setShowCreateModal(true)} />
          ) : (
            <div className="wp-grid">
              {workspaces.map(ws => (
                <WorkspaceCard
                  key={ws._id || ws.id}
                  workspace={ws}
                  onOpen={() => handleOpen(ws)}
                  onDelete={() => handleDelete(ws._id || ws.id)}
                />
              ))}
              <CreateWorkspaceCard onClick={() => setShowCreateModal(true)} />
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateWorkspaceModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />
      )}
      {showJoinModal && (
        <JoinWorkspaceModal onClose={() => setShowJoinModal(false)} onJoin={handleJoin} />
      )}
    </div>
  );
}
