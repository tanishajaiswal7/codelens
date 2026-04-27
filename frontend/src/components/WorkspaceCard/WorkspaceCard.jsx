import React from 'react';
import { useNavigate } from 'react-router-dom';
import './WorkspaceCard.css';

function WorkspaceCard({ workspace, role }) {
  const navigate = useNavigate();

  return (
    <div className="workspace-card" onClick={() => navigate(`/workspace/${workspace._id}`)}>
      <div className="workspace-header">
        <h3>{workspace.name}</h3>
        <span className={`role-badge role-${role}`}>{role}</span>
      </div>
      <div className="workspace-plan">Plan: {workspace.plan}</div>
      <div className="workspace-footer">
        <small>Created {new Date(workspace.createdAt).toLocaleDateString()}</small>
      </div>
    </div>
  );
}

export default WorkspaceCard;
