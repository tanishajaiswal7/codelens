import { useState } from 'react';
import './HelpModals.css';

export default function GettingStartedModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚀 Getting Started</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Connect Your GitHub Account</h3>
              <p>Click the "Connect GitHub" button to link your GitHub account and access repositories.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Select a Repository</h3>
              <p>Browse and select a repository from your account to start analyzing code.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Choose a Pull Request</h3>
              <p>Select a pull request to get AI-powered code review suggestions and insights.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Review with Socratic Method</h3>
              <p>Use the Socratic method to engage in guided learning about code improvements.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">5</div>
            <div className="step-content">
              <h3>View History & Settings</h3>
              <p>Track your review history and customize your preferences in the settings panel.</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Got it!</button>
        </div>
      </div>
    </div>
  );
}
