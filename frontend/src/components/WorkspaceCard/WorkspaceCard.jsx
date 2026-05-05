import React from 'react';
import { useNavigate } from 'react-router-dom';
import './WorkspaceCard.css';

function WorkspaceCard({ workspace, role, onDelete, isDeleting = false }) {
  const navigate = useNavigate();

  const handleDelete = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (onDelete) {
      onDelete(workspace._id, workspace.name);
    }
  };

  return (
    <div className="workspace-card" onClick={() => navigate(`/workspace/${workspace._id}`)}>
      <div className="workspace-header">
        <h3>{workspace.name}</h3>
        <span className={`role-badge role-${role}`}>{role}</span>
      </div>
      <div className="workspace-plan">Plan: {workspace.plan}</div>
      <div className="workspace-footer">
        <small>Created {new Date(workspace.createdAt).toLocaleDateString()}</small>
        {role === 'owner' && onDelete && (
          <button
            type="button"
            className="workspace-delete-btn"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}

export default WorkspaceCard;
