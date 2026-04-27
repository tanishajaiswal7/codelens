import { useState } from 'react';
import './HelpModals.css';

export default function GuidesModal({ isOpen, onClose }) {
  const [selectedGuide, setSelectedGuide] = useState(null);

  if (!isOpen) return null;

  const guides = [
    {
      id: 1,
      title: 'Code Review Best Practices',
      description: 'Learn how to effectively review pull requests using CodeLens AI',
      content: [
        'Focus on logic and design patterns',
        'Check for edge cases and error handling',
        'Look for performance opportunities',
        'Ensure code readability and maintainability',
        'Use AI suggestions as guidance, not rules'
      ]
    },
    {
      id: 2,
      title: 'Using the Socratic Method',
      description: 'Engage in guided learning through AI-powered questions',
      content: [
        'The Socratic method asks thoughtful questions',
        'Answer questions to explore solutions yourself',
        'Build deeper understanding of code concepts',
        'Learn from feedback and explanations',
        'Track your learning progress'
      ]
    },
    {
      id: 3,
      title: 'GitHub Integration Setup',
      description: 'Connect and configure your GitHub account',
      content: [
        'Click "Connect GitHub" in the dashboard',
        'Authorize the CodeLens application',
        'Select repositories you want to analyze',
        'Configure review preferences',
        'Start reviewing pull requests'
      ]
    },
    {
      id: 4,
      title: 'Managing Multiple Repositories',
      description: 'Work with multiple projects simultaneously',
      content: [
        'Add multiple repositories from your account',
        'Switch between repos in the selector',
        'Keep separate review histories per repo',
        'Customize settings for each repository',
        'Monitor activity across all projects'
      ]
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📚 Guides & Tutorials</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!selectedGuide ? (
            <div className="guides-list">
              {guides.map((guide) => (
                <div 
                  key={guide.id}
                  className="guide-card"
                  onClick={() => setSelectedGuide(guide)}
                >
                  <h3>{guide.title}</h3>
                  <p>{guide.description}</p>
                  <span className="guide-arrow">→</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="guide-detail">
              <button className="guide-back" onClick={() => setSelectedGuide(null)}>
                ← Back to Guides
              </button>
              <h3>{selectedGuide.title}</h3>
              <ul className="guide-content">
                {selectedGuide.content.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
