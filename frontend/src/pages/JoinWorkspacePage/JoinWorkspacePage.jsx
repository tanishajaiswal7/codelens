import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspaceApi } from '../../api/workspaceApi.js';
import BackButton from '../../components/BackButton/BackButton.jsx';
import './JoinWorkspacePage.css';

function JoinWorkspacePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [inviteDetails, setInviteDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [pasteError, setPasteError] = useState('');

  useEffect(() => {
    if (token) {
      fetchInviteDetails();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Check if there's a pending invite after login
    const pendingToken = localStorage.getItem('pendingInvite');
    if (pendingToken && token === pendingToken) {
      // Auto-accept the pending invite
      autoAcceptInvite(pendingToken);
    }
  }, [token]);

  const fetchInviteDetails = async () => {
    try {
      setIsLoading(true);
      const data = await workspaceApi.acceptInvite(token);

      if (data.workspace && data.workspace._id) {
        setIsSuccessful(true);
        setInviteDetails(data);
        // Navigate after showing success for 1 second
        setTimeout(() => {
          navigate(`/workspace/${data.workspace._id}`);
        }, 1000);
        return;
      }

      setInviteDetails(data);
    } catch (err) {
      setError(err.message || 'Failed to verify invite');
      localStorage.removeItem('pendingInvite');
    } finally {
      setIsLoading(false);
    }
  };

  const autoAcceptInvite = async (inviteToken) => {
    try {
      setIsAccepting(true);
      const data = await workspaceApi.acceptInvite(inviteToken);
      localStorage.removeItem('pendingInvite');
      if (data.workspace && data.workspace._id) {
        localStorage.removeItem('pendingInvite');
        navigate(`/workspace/${data.workspace._id}`);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to auto-accept invite:', err);
      }
      localStorage.removeItem('pendingInvite');
    }
  };

  const handleAcceptInvite = async () => {
    try {
      setIsAccepting(true);
      const data = await workspaceApi.acceptInvite(token);
      localStorage.removeItem('pendingInvite');
      if (data.workspace && data.workspace._id) {
        setIsSuccessful(true);
        // Navigate after showing success for 1 second
        setTimeout(() => {
          navigate(`/workspace/${data.workspace._id}`);
        }, 1000);
      }
    } catch (err) {
      setError(err.message || 'Failed to accept invite');
      setIsAccepting(false);
    }
  };

  const handleLoginWithInvite = () => {
    localStorage.setItem('pendingInvite', token);
    navigate('/login');
  };

  const handleRegisterWithInvite = () => {
    localStorage.setItem('pendingInvite', token);
    navigate('/register');
  };

  const extractInviteToken = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const urlMatch = trimmed.match(/\/join\/([0-9a-fA-F]+)/i);
    if (urlMatch) return urlMatch[1];

    const tokenMatch = trimmed.match(/^[0-9a-fA-F]{20,}$/);
    return tokenMatch ? trimmed : null;
  };

  const handlePasteInvite = (e) => {
    e.preventDefault();
    const parsedToken = extractInviteToken(inviteInput);
    if (!parsedToken) {
      setPasteError('Please paste a valid invite link or token.');
      return;
    }

    setPSuccessful)
    return (
      <div className="join-workspace-page">
        <div className="success-redirect-state">
          <div className="success-icon">✓</div>
          <h2>Successfully Joined!</h2>
          <p className="workspace-name">{inviteDetails?.workspace?.name || inviteDetails?.workspaceName}</p>
          <p className="description">Redirecting to workspace...</p>
          <div className="spinner"></div>
        </div>
      </div>
    );

  if (isasteError('');
    navigate(`/join/${parsedToken}`);
  };

  if (isLoading)
    return (
      <div className="join-workspace-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Verifying invite...</p>
        </div>
      </div>
    );

  if (!token)
    return (
      <div className="join-workspace-page">
        <div className="join-form-state">
          <h2>Join Workspace</h2>
          <p className="description">
            Paste the workspace invite link or token that was sent to you, then join the workspace.
          </p>
          <form className="join-invite-form" onSubmit={handlePasteInvite}>
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="https://codelens.ai/join/abc123..."
              className="invite-input"
            />
            {pasteError && <div className="input-error">{pasteError}</div>}
            <button type="submit" className="btn-primary">Join Workspace</button>
          </form>
          <p className="note-text">
            If you are not logged in, you will be asked to sign in or register first.
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="join-workspace-page">
        <div className="error-state">
          <h2>Invalid Invite</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    );

  if (inviteDetails?.message === 'Please log in to accept this invite')
    return (
      <div className="join-workspace-page">
        <div className="login-required-state">
          <h2>Join Workspace</h2>
          <p className="workspace-name">{inviteDetails.workspaceName}</p>
          <p className="description">
            You've been invited to join a workspace. Please log in or create an account to accept.
          </p>
          <button onClick={handleLoginWithInvite} className="btn-primary">
            Log In
          </button>
          <p className="divider">or</p>
          <button onClick={handleRegisterWithInvite} className="btn-secondary">
            Create Account
          </button>
          <p className="note-text">
            Once joined, you can connect your own GitHub account in Settings.
          </p>
        </div>
      </div>
    );

  return (
    <div className="join-workspace-page">
      <div className="success-state">
        <div className="success-icon">✓</div>
        <h2>Join Workspace</h2>
        <p className="workspace-name">{inviteDetails.workspaceName}</p>
        <p className="description">Accept this invitation to join the workspace and collaborate with your team.</p>
        <button
          onClick={handleAcceptInvite}
          className="btn-primary"
          disabled={isAccepting}
        >
          {isAccepting ? 'Accepting...' : 'Accept Invite'}
        </button>
      </div>
    </div>
  );
}

export default JoinWorkspacePage;
