import { useState } from 'react';
import './HelpModals.css';

export default function APIReferenceModal({ isOpen, onClose }) {
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);

  if (!isOpen) return null;

  const endpoints = [
    {
      id: 1,
      name: 'Authentication',
      method: 'POST',
      path: '/api/auth/login',
      description: 'Authenticate user with credentials',
      response: { 
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', 
        user: { 
          id: '12144118', 
          email: 'user@example.com', 
          name: 'John Doe' 
        } 
      }
    },
    {
      id: 2,
      name: 'GitHub Auth',
      method: 'GET',
      path: '/api/github/auth',
      description: 'Initiate GitHub OAuth flow',
      response: { 
        authUrl: 'https://github.com/login/oauth/authorize?client_id=...' 
      }
    },
    {
      id: 3,
      name: 'Get Repositories',
      method: 'GET',
      path: '/api/github/repos',
      description: 'Fetch user\'s GitHub repositories',
      response: { 
        repos: [
          { 
            name: 'codelens-ai', 
            url: 'https://github.com/user/codelens-ai', 
            description: 'AI-powered code review tool' 
          }
        ] 
      }
    },
    {
      id: 4,
      name: 'Get Pull Requests',
      method: 'GET',
      path: '/api/github/prs/:repo',
      description: 'Get pull requests for a repository',
      response: { 
        prs: [
          { 
            id: 'pr-001', 
            title: 'Add new feature', 
            author: 'john-dev', 
            status: 'open' 
          }
        ] 
      }
    },
    {
      id: 5,
      name: 'Submit Review',
      method: 'POST',
      path: '/api/review/submit',
      description: 'Submit code review analysis',
      response: { 
        reviewId: 'rev-12345', 
        status: 'success',
        message: 'Review submitted successfully'
      }
    },
    {
      id: 6,
      name: 'Get Review History',
      method: 'GET',
      path: '/api/history',
      description: 'Fetch user\'s review history',
      response: { 
        history: [
          { 
            id: 'rev-001', 
            date: '2024-04-24', 
            repo: 'codelens-ai', 
            pr: 'PR #123' 
          }
        ] 
      }
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ API Reference</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!selectedEndpoint ? (
            <div className="endpoints-list">
              {endpoints.map((endpoint) => (
                <div 
                  key={endpoint.id}
                  className="endpoint-card"
                  onClick={() => setSelectedEndpoint(endpoint)}
                >
                  <div className="endpoint-method" style={{
                    background: endpoint.method === 'GET' ? '#10a981' : 
                               endpoint.method === 'POST' ? '#f59e0b' : '#ef4444'
                  }}>
                    {endpoint.method}
                  </div>
                  <div className="endpoint-info">
                    <h4>{endpoint.name}</h4>
                    <code>{endpoint.path}</code>
                  </div>
                  <span className="endpoint-arrow">→</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="endpoint-detail">
              <button className="guide-back" onClick={() => setSelectedEndpoint(null)}>
                ← Back to Endpoints
              </button>
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{
                    background: selectedEndpoint.method === 'GET' ? '#10a981' : '#f59e0b',
                    color: 'var(--text)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {selectedEndpoint.method}
                  </span>
                  <code style={{ color: 'var(--accent)' }}>{selectedEndpoint.path}</code>
                </div>
                <h3>{selectedEndpoint.name}</h3>
                <p>{selectedEndpoint.description}</p>
                <pre style={{ 
                  background: 'rgba(0,0,0,0.2)',
                  padding: '12px',
                  borderRadius: '6px',
                  overflow: 'auto',
                  marginTop: '12px'
                }}>
{JSON.stringify(selectedEndpoint.response, null, 2)}
                </pre>
              </div>
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
