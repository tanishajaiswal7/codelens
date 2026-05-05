import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspaceApi } from '../../api/workspaceApi.js';
import WorkspaceCard from '../../components/WorkspaceCard/WorkspaceCard.jsx';
import CreateWorkspaceModal from '../../components/CreateWorkspaceModal/CreateWorkspaceModal.jsx';
import BackButton from '../../components/BackButton/BackButton.jsx';
import './WorkspacePage.css';

function WorkspacePage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await workspaceApi.getMyWorkspaces();
      setWorkspaces(data.workspaces || []);
    } catch (err) {
      setError(err.message || 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkspace = async (name) => {
    try {
      setIsCreating(true);
      const data = await workspaceApi.createWorkspace(name);
      // Redirect to the newly created workspace detail page
      navigate(`/workspace/${data.workspace._id}`);
    } catch (err) {
      setError(err.message || 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId, workspaceName) => {
    const confirmed = window.confirm(`Delete workspace \"${workspaceName}\"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingWorkspaceId(workspaceId);
      await workspaceApi.deleteWorkspace(workspaceId);
      setWorkspaces((prev) => prev.filter((item) => item.workspace._id !== workspaceId));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to delete workspace');
    } finally {
      setDeletingWorkspaceId(null);
    }
  };

  return (
    <div className="workspace-page">
      <BackButton fallback="/dashboard" />
      <div className="workspace-header-section">
        <div>
          <h1>My Workspaces</h1>
          <p className="workspace-subtitle">
            Create a new workspace or join an existing one with an invite link.
          </p>
        </div>
        <div className="workspace-action-buttons">
          <button
            className="btn-secondary"
            onClick={() => navigate('/join')}
          >
            Join Workspace
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
            disabled={isCreating}
          >
            + Create Workspace
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isLoading ? (
        <div className="loading">Loading workspaces...</div>
      ) : workspaces.length === 0 ? (
        <div className="empty-state">
          <p>No workspaces yet.</p>
          <div className="empty-actions">
            <button
              className="btn-secondary"
              onClick={() => navigate('/join')}
            >
              Join Workspace
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
              disabled={isCreating}
            >
              Create Workspace
            </button>
          </div>
        </div>
      ) : (
        <div className="workspaces-grid">
          {workspaces.map((item) => (
            <WorkspaceCard
              key={item.workspace._id}
              workspace={item.workspace}
              role={item.role}
              onDelete={item.role === 'owner' ? handleDeleteWorkspace : undefined}
              isDeleting={deletingWorkspaceId === item.workspace._id}
            />
          ))}
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateWorkspace}
        isLoading={isCreating}
      />
    </div>
  );
}

export default WorkspacePage;
