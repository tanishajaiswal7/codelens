import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspaceApi } from '../../api/workspaceApi.js';
import InviteModal from '../../components/InviteModal/InviteModal.jsx';
import BackButton from '../../components/BackButton/BackButton.jsx';
import MemberPRReviews from '../../components/MemberPRReviews/MemberPRReviews.jsx';
import './WorkspaceDetailPage.css';

function WorkspaceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [requestingUserRole, setRequestingUserRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inviteResults, setInviteResults] = useState([]);
  const [lastShareLink, setLastShareLink] = useState(null);
  const [inviteLinkMeta, setInviteLinkMeta] = useState(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [repoUrl, setRepoUrl] = useState('');
  const [showRepoInput, setShowRepoInput] = useState(false);

  useEffect(() => {
    fetchWorkspaceDetail();
    fetchMembers();
    fetchInviteLink();
  }, [id]);

  const fetchWorkspaceDetail = async () => {
    try {
      const data = await workspaceApi.getWorkspace(id);
      setWorkspace(data.workspace);
      setRequestingUserRole(data.requestingUserRole || null);
      setRepoUrl(data.workspace.repoUrl || '');
      // Fetch pending invites after we know the user's role
      if (data.requestingUserRole === 'owner' || data.requestingUserRole === 'admin') {
        await fetchPendingInvites();
      }
    } catch (err) {
      setError(err.message || 'Failed to load workspace');
    }
  };

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const data = await workspaceApi.getMembers(id);
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message || 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInviteLink = async () => {
    try {
      const data = await workspaceApi.getInviteLink(id);
      setLastShareLink(data.inviteUrl || null);
      setInviteLinkMeta({
        token: data.token || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load existing invite link:', err);
      }
    }
  };

  const getExpiryLabel = (expiresAt) => {
    if (!expiresAt) return 'No active reusable link';
    const now = new Date();
    const diff = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Expires today';
    return `Expires in ${diff} day${diff === 1 ? '' : 's'}`;
  };

  const buildPendingInviteUrl = (token) => {
    if (!token) return null;
    return `${window.location.origin}/join/${token}`;
  };

  const copyPendingInviteLink = (token) => {
    const url = buildPendingInviteUrl(token);
    if (!url) return;
    navigator.clipboard.writeText(url);
  };

  const fetchPendingInvites = async () => {
    try {
      const data = await workspaceApi.getPendingInvites(id);
      setPendingInvites(data || []);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load pending invites:', err);
      }
    }
  };

  const handleInviteEmails = async (emails) => {
    try {
      setIsSending(true);
      setError(null);
      const results = await Promise.all(
        emails.map(async (email) => {
          try {
            const result = await workspaceApi.inviteMember(id, email);
            return {
              email,
              success: true,
              inviteUrl: result.inviteUrl,
              emailSent: result.emailSent !== false,
            };
          } catch (err) {
            return {
              email,
              success: false,
              error: err.response?.data?.error || err.message || 'Failed to invite',
            };
          }
        })
      );

      setInviteResults(results);
      setIsSending(false);
      setTimeout(() => {
        fetchMembers();
        fetchPendingInvites();
      }, 1000);
      return results;
    } catch (err) {
      setError(err.message || 'Failed to send invites');
      setIsSending(false);
      return [];
    }
  };

  const handleGenerateInviteLink = async () => {
    try {
      setIsGeneratingLink(true);
      setError(null);
      const result = await workspaceApi.generateInviteLink(id);
      setLastShareLink(result.inviteUrl || null);
      setInviteLinkMeta({
        token: result.token || null,
        expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
      });
      await fetchPendingInvites();
      setIsGeneratingLink(false);
      return result;
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create invite link');
      setIsGeneratingLink(false);
      return null;
    }
  };

  const handleDeleteInviteLink = async () => {
    if (!confirm('Delete the current reusable invite link?')) return;
    try {
      await workspaceApi.deleteInviteLink(id);
      setLastShareLink(null);
      setInviteLinkMeta(null);
      await fetchPendingInvites();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to delete invite link');
    }
  };

  const handleDeletePendingInvite = async (inviteId) => {
    if (!confirm('Delete this pending invite entry?')) return;
    try {
      await workspaceApi.deletePendingInvite(id, inviteId);
      await fetchPendingInvites();
      await fetchInviteLink();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to delete pending invite');
    }
  };

  const handleUpdateRepo = async () => {
    try {
      await workspaceApi.updateRepo(id, repoUrl.trim());
      setWorkspace({ ...workspace, repoUrl: repoUrl.trim() });
      setShowRepoInput(false);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update repository');
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!confirm('Are you sure you want to leave this workspace?')) return;

    try {
      await workspaceApi.leaveWorkspace(id);
      navigate('/workspace');
    } catch (err) {
      setError(err.message || 'Failed to leave workspace');
    }
  };

  if (isLoading)
    return <div className="workspace-detail-page">Loading...</div>;

  if (!workspace)
    return <div className="workspace-detail-page error-state">Workspace not found</div>;

  const isOwnerOrAdmin = requestingUserRole === 'owner' || requestingUserRole === 'admin';
  const isMember = requestingUserRole === 'member';

  const handleOpenDashboard = () => {
    navigate(`/workspace/${id}/dashboard`);
  };

  // MEMBER VIEW
  if (isMember) {
    return (
      <div className="workspace-detail-page">
        <BackButton fallback="/workspace" />
        
        <div className="member-view">
          <div className="mv-welcome">
            <h2 className="mv-title">
              You are part of {workspace.name}
            </h2>
            <p className="mv-subtitle">
              Your manager will review your pull requests and 
              you will be notified here and by email when a 
              review is complete.
            </p>
          </div>

          <div className="mv-how-it-works">
            <h3 className="mv-section-title">How it works</h3>
            <div className="mv-steps">
              <div className="mv-step">
                <span className="mv-step-num">1</span>
                <div className="mv-step-text">
                  <strong>Write your code</strong>
                  <p>Make changes to the project on your computer</p>
                </div>
              </div>
              <div className="mv-step">
                <span className="mv-step-num">2</span>
                <div className="mv-step-text">
                  <strong>Open a Pull Request on GitHub</strong>
                  <p>Push your code and create a PR on the GitHub repo</p>
                </div>
              </div>
              <div className="mv-step">
                <span className="mv-step-num">3</span>
                <div className="mv-step-text">
                  <strong>Wait for review</strong>
                  <p>Your manager will review your PR using AI assistance</p>
                </div>
              </div>
              <div className="mv-step">
                <span className="mv-step-num">4</span>
                <div className="mv-step-text">
                  <strong>Get notified</strong>
                  <p>You will receive an email and see it here when reviewed</p>
                </div>
              </div>
            </div>
          </div>

          {workspace.repoFullName && (
            <div className="mv-repo-info">
              <span className="mv-repo-label">Project repository</span>
              <a
                href={workspace.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mv-repo-link"
              >
                {workspace.repoFullName} →
              </a>
            </div>
          )}

          <div className="mv-notifications">
            <h3 className="mv-section-title">Your PR Reviews</h3>
            <MemberPRReviews workspaceId={id} />
          </div>
        </div>
      </div>
    );
  }

  // OWNER/ADMIN VIEW (existing)

  // OWNER/ADMIN VIEW (existing)
  return (
    <div className="workspace-detail-page">
      <BackButton fallback="/workspace" />
      <div className="detail-header">
        <div>
          <h1>{workspace.name}</h1>
          <p className="detail-meta">
            Plan: <span className="plan-badge">{workspace.plan}</span>
          </p>
        </div>
        <div className="header-actions">
          {isOwnerOrAdmin && (
            <button onClick={handleOpenDashboard} className="btn-primary">
              Open Dashboard
            </button>
          )}
          <button onClick={handleLeaveWorkspace} className="btn-secondary">
            Leave Workspace
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="workspace-action-card">
        <div>
          <p className="action-label">Workspace access</p>
          <h2>{members.length} team member{members.length === 1 ? '' : 's'}</h2>
          <p className="action-description">
            Invite teammates so your whole team can collaborate, submit reviews, and see shared results from one place.
          </p>
          {lastShareLink ? (
            <div className="persistent-invite-link">
              <p className="persistent-label">Current shareable join link</p>
              <div className="invite-link-box persistent-link-box">
                <div className="persistent-link-details">
                  <code>{lastShareLink}</code>
                  <div className="invite-link-meta">
                    {inviteLinkMeta?.expiresAt && (
                      <span>{getExpiryLabel(inviteLinkMeta.expiresAt)}</span>
                    )}
                    <button
                      className="copy-btn"
                      type="button"
                      onClick={() => navigator.clipboard.writeText(lastShareLink)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
              <div className="invite-link-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDeleteInviteLink();
                  }}
                  disabled={isGeneratingLink}
                >
                  Delete share link
                </button>
              </div>
            </div>
          ) : (
            isOwnerOrAdmin && (
              <div className="persistent-invite-link">
                <p className="persistent-label">No active reusable link</p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleGenerateInviteLink}
                  disabled={isGeneratingLink}
                >
                  {isGeneratingLink ? 'Generating...' : 'Create reusable link'}
                </button>
              </div>
            )
          )}
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-primary action-btn"
            disabled={isSending || isGeneratingLink}
          >
            Invite teammates
          </button>
        )}
      </div>

      <div className="detail-section">
        <div className="section-header">
          <h2>Team Members ({members.length})</h2>
          {!isOwnerOrAdmin && (
            <span className="info-pill">Read-only member</span>
          )}
        </div>

        {members.length === 0 ? (
          <div className="empty-members">
            <p>No members yet. Invite your team!</p>
          </div>
        ) : (
          <div className="members-table">
            <div className="table-header">
              <div className="col-name">Name</div>
              <div className="col-email">Email</div>
              <div className="col-role">Role</div>
              <div className="col-reviews">Reviews</div>
              <div className="col-latest">Latest Review</div>
              <div className="col-joined">Joined</div>
            </div>
            {members.map((member) => (
              <div key={member._id} className="table-row">
                <div className="col-name">
                  {member.githubAvatar && (
                    <img src={member.githubAvatar} alt={member.name} />
                  )}
                  <span>{member.name || member.githubUsername}</span>
                </div>
                <div className="col-email">{member.email}</div>
                <div className="col-role">
                  <span className={`role-badge role-${member.role}`}>{member.role}</span>
                </div>
                <div className="col-reviews">{member.reviewsThisMonth}</div>
                <div className="col-latest">
                  {member.latestReview ? (
                    <div className="latest-review-info">
                      <span className={`verdict-badge verdict-${member.latestReview.verdict}`}>
                        {member.latestReview.verdict === 'needs_revision' && '🔴 Needs Revision'}
                        {member.latestReview.verdict === 'approved' && '✅ Approved'}
                        {member.latestReview.verdict === 'minor_issues' && '⚠️ Minor Issues'}
                      </span>
                      {member.latestReview.criticalCount > 0 && (
                        <span className="critical-badge">
                          {member.latestReview.criticalCount} critical
                        </span>
                      )}
                      <span className="issue-count">
                        {member.latestReview.issueCount} {member.latestReview.issueCount === 1 ? 'issue' : 'issues'}
                      </span>
                    </div>
                  ) : (
                    <span className="no-reviews">No reviews yet</span>
                  )}
                </div>
                <div className="col-joined">{new Date(member.joinedAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOwnerOrAdmin && (
        <div className="detail-section">
          <div className="section-header">
            <h2>Pending Invites ({pendingInvites.length})</h2>
          </div>
          {pendingInvites.length === 0 ? (
            <div className="empty-members">
              <p>No pending invites. Send some invites to see them here!</p>
            </div>
          ) : (
            <div className="pending-invites-table">
              <div className="pending-table-header">
                <div className="pending-col-email">Email</div>
                <div className="pending-col-type">Type</div>
                <div className="pending-col-uses">Uses</div>
                <div className="pending-col-expires">Expires</div>
                <div className="pending-col-sent">Sent</div>
                <div className="pending-col-action">Action</div>
              </div>
              {pendingInvites.map((invite) => (
                <div key={invite._id} className="pending-table-row">
                  <div className="pending-col-email">
                    <span>{invite.email}</span>
                  </div>
                  <div className="pending-col-type">
                    <span className={`role-badge ${invite.isReusable ? 'role-admin' : 'role-member'}`}>
                      {invite.isReusable ? 'Reusable Link' : 'Email Invite'}
                    </span>
                  </div>
                  <div className="pending-col-uses">
                    {invite.isReusable ? `${invite.uses}/${invite.maxUses || '∞'}` : '1/1'}
                  </div>
                  <div className="pending-col-expires">
                    {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="pending-col-sent">
                    {invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="pending-col-action">
                    <button
                      type="button"
                      className="btn-tertiary copy-link-btn"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        copyPendingInviteLink(invite.token);
                      }}
                      disabled={!invite.token}
                    >
                      Copy link
                    </button>
                    <button
                      type="button"
                      className="btn-tertiary delete-invite-btn"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleDeletePendingInvite(invite._id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isOwnerOrAdmin && (
        <div className="detail-section">
          <div className="section-header">
            <h2>Repository Settings</h2>
          </div>
          <div className="repo-settings">
            {workspace.repoUrl ? (
              <div className="repo-display">
                <span className="repo-url">{workspace.repoUrl}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowRepoInput(true)}
                >
                  Change Repository
                </button>
              </div>
            ) : (
              <div className="repo-setup">
                <p>No repository linked yet. Link a GitHub repository to enable PR reviews and release reports.</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowRepoInput(true)}
                >
                  Link Repository
                </button>
              </div>
            )}
            {showRepoInput && (
              <div className="repo-input-section">
                <input
                  type="text"
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="repo-url-input"
                />
                <div className="repo-input-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleUpdateRepo}
                    disabled={!repoUrl.trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn-tertiary"
                    onClick={() => {
                      setShowRepoInput(false);
                      setRepoUrl(workspace.repoUrl || '');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setIsSending(false);
          setIsGeneratingLink(false);
        }}
        onInviteEmails={handleInviteEmails}
        onGenerateShareLink={handleGenerateInviteLink}
        isSending={isSending}
        isGeneratingLink={isGeneratingLink}
        shareLink={lastShareLink}
        workspaceName={workspace.name}
      />
    </div>
  );
}

export default WorkspaceDetailPage;
