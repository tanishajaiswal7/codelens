import React, { useState } from 'react';
import './CreateWorkspaceModal.css';

function CreateWorkspaceModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      alert('Workspace name must be at least 2 characters');
      return;
    }
    onSubmit(name);
    setName('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-workspace-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Workspace</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Workspace Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Team Workspace"
              disabled={isLoading}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateWorkspaceModal;
