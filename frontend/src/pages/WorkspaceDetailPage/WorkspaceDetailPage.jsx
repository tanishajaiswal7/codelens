import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboardApi.js';
import { workspaceApi } from '../../api/workspaceApi.js';
import BackButton from '../../components/BackButton/BackButton.jsx';
import InviteModal from '../../components/InviteModal/InviteModal.jsx';
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
  const [workspaceStats, setWorkspaceStats] = useState(null);

  useEffect(() => {
    fetchWorkspaceDetail();
    fetchMembers();
    fetchInviteLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchWorkspaceStats = async () => {
    try {
      const data = await dashboardApi.getStats(id);
      setWorkspaceStats(data?.stats || null);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load workspace stats:', err);
      }
    }
  };

  const fetchWorkspaceDetail = async () => {
    try {
      const data = await workspaceApi.getWorkspace(id);
      setWorkspace(data.workspace);
      setRequestingUserRole(data.requestingUserRole || null);
      setRepoUrl(data.workspace?.repoUrl || '');

      if (data.requestingUserRole === 'owner' || data.requestingUserRole === 'admin') {
        await fetchPendingInvites();
        await fetchWorkspaceStats();
      } else {
        setWorkspaceStats(null);
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

    const previousInvites = pendingInvites;
    setPendingInvites((current) => current.filter((invite) => invite._id !== inviteId));

    try {
      await workspaceApi.deleteInvite(id, inviteId);
      alert('Invite deleted successfully.');
    } catch (err) {
      setPendingInvites(previousInvites);
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
    const confirmed = window.confirm(
      'Are you sure you want to leave this workspace? You will need a new invite to rejoin.'
    );
    if (!confirmed) return;

    try {
      await workspaceApi.leaveWorkspace(id);
      navigate('/workspace');
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to leave workspace';

      if (message.toLowerCase().includes('owner')) {
        alert('Workspace owners cannot leave. You created this workspace.');
      } else {
        alert(message);
      }
    }
  };

  const handleOpenDashboard = () => {
    navigate(`/workspace/${id}/dashboard`);
  };

  if (isLoading) {
    return <div className="workspace-detail-page">Loading...</div>;
  }

  if (!workspace) {
    return <div className="workspace-detail-page error-state">Workspace not found</div>;
  }

  const isOwnerOrAdmin = requestingUserRole === 'owner' || requestingUserRole === 'admin';
  const isMember = requestingUserRole === 'member';
  const reviewedMembers = members.filter((member) => member.latestReview);
  const approvedMembers = reviewedMembers.filter((member) => member.latestReview?.verdict === 'approved').length;
  const fallbackCriticalCount = reviewedMembers.reduce(
    (count, member) => count + (member.latestReview?.criticalCount || 0),
    0
  );
  const fallbackQualityScore = reviewedMembers.length
    ? Math.round((approvedMembers / reviewedMembers.length) * 100)
    : 0;
  const statOpenPRs = workspaceStats?.totalOpenPRs ?? 0;
  const statCriticalIssues = workspaceStats?.criticalCount ?? fallbackCriticalCount;
  const statQualityScore = workspaceStats?.qualityScore ?? fallbackQualityScore;

  const repoName = workspace.repoFullName || (workspace.repoUrl ? workspace.repoUrl.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '') : null);

  const getMemberInitials = (member) => {
    const source = member?.name || member?.email || member?.githubUsername || 'U';
    return source
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getAvatarToneClass = (index) => {
    if (index === 0) return 'wsd-avatar--first';
    if (index === 1) return 'wsd-avatar--second';
    if (index === 2) return 'wsd-avatar--third';
    return 'wsd-avatar--default';
  };

  const getRoleToneClass = (role) => {
    if (role === 'owner') return 'wsd-role-pill--owner';
    if (role === 'admin') return 'wsd-role-pill--admin';
    return 'wsd-role-pill--member';
  };

  const getInviteStatusMeta = (invite) => {
    if (invite.status === 'expired') {
      return { label: 'Expired', tone: 'expired' };
    }
    if (invite.status === 'used') {
      return { label: 'Used', tone: 'used' };
    }
    return { label: 'Pending', tone: 'pending' };
  };

  const statCards = [
    { label: 'Team members', value: members.length, tone: 'neutral' },
    { label: 'Open PRs', value: statOpenPRs, tone: statOpenPRs > 0 ? 'amber' : 'neutral' },
    { label: 'Critical issues', value: statCriticalIssues, tone: statCriticalIssues > 0 ? 'red' : 'neutral' },
    { label: 'Quality score', value: `${statQualityScore}%`, tone: statQualityScore >= 80 ? 'green' : 'neutral' },
  ];

  const renderRepoCard = ({ readOnly = false } = {}) => {
    const hasRepo = Boolean(workspace.repoUrl || workspace.repoFullName);
    const repoHref = workspace.repoUrl || (workspace.repoFullName ? `https://github.com/${workspace.repoFullName}` : null);

    return (
      <div className="wsd-card">
        <div className="wsd-card__header">
          <span>GitHub repository</span>
          {!readOnly && hasRepo && (
            <button type="button" className="wsd-btn wsd-btn--link" onClick={() => setShowRepoInput((current) => !current)}>
              Change
            </button>
          )}
        </div>
        <div className="wsd-card__body">
          {hasRepo && (!showRepoInput || readOnly) ? (
            <>
              <div className="wsd-repo-shell">
                <div className="wsd-repo-icon" aria-hidden="true">GH</div>
                <div className="wsd-repo-copy">
                  <div className="wsd-repo-name">{repoName}</div>
                  <div className="wsd-repo-subtitle">
                    Linked · {isOwnerOrAdmin ? `${statOpenPRs} open pull request${statOpenPRs === 1 ? '' : 's'}` : 'Team repository'}
                  </div>
                </div>
                {repoHref && (
                  <a href={repoHref} target="_blank" rel="noopener noreferrer" className="wsd-btn wsd-btn--ghost wsd-repo-link">
                    View on GitHub
                  </a>
                )}
              </div>
              {readOnly ? (
                <p className="wsd-help-text">Open a pull request on GitHub and your manager will review it in the workspace dashboard.</p>
              ) : (
                <p className="wsd-help-text">Team members can open pull requests against this repository and managers can review them in the dashboard.</p>
              )}
            </>
          ) : (
            <>
              <p className="wsd-help-text">Link a GitHub repository to unlock PR reviews, release reporting, and workspace review history.</p>
              <div className="wsd-repo-input-group">
                <input
                  type="text"
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="wsd-input"
                />
                <div className="wsd-inline-actions">
                  <button type="button" className="wsd-btn wsd-btn--primary" onClick={handleUpdateRepo} disabled={!repoUrl.trim()}>
                    Link repo
                  </button>
                  {workspace.repoUrl && !readOnly && showRepoInput && (
                    <button
                      type="button"
                      className="wsd-btn wsd-btn--ghost"
                      onClick={() => {
                        setShowRepoInput(false);
                        setRepoUrl(workspace.repoUrl || '');
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderHowItWorksCard = () => {
    const steps = [
      { title: 'Write your code', description: 'Make changes locally and keep commits focused so reviews stay fast and useful.' },
      { title: 'Open a pull request on GitHub', description: 'Push your branch and create a PR against the linked repository.' },
      { title: 'Manager reviews using AI', description: 'The manager dashboard highlights risks, verdicts, and review notes in one place.' },
      { title: 'You get notified', description: 'Review outcomes are visible here and can be surfaced through team notifications.' },
    ];

    return (
      <div className="wsd-card">
        <div className="wsd-card__header">
          <span>How it works</span>
        </div>
        <div className="wsd-card__body">
          <div className="wsd-step-list">
            {steps.map((step, index) => (
              <div key={step.title} className="wsd-step-row">
                <div className="wsd-step-circle">{index + 1}</div>
                <div className="wsd-step-copy">
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPendingInvitesCard = () => {
    if (!isOwnerOrAdmin) return null;

    return (
      <div className="wsd-card wsd-card--wide">
        <div className="wsd-card__header">
          <span>Pending invites</span>
          <span className="wsd-mini-count">{pendingInvites.length}</span>
        </div>
        <div className="wsd-card__body">
          {lastShareLink && inviteLinkMeta && (
            <div className="wsd-link-panel">
              <div>
                <div className="wsd-link-label">Current shareable link</div>
                <div className="wsd-link-value">{lastShareLink}</div>
                <div className="wsd-link-meta">{inviteLinkMeta.expiresAt ? getExpiryLabel(inviteLinkMeta.expiresAt) : 'No active reusable link'}</div>
              </div>
              <div className="wsd-inline-actions">
                <button type="button" className="wsd-btn wsd-btn--ghost" onClick={() => navigator.clipboard.writeText(lastShareLink)}>
                  Copy link
                </button>
                <button type="button" className="wsd-btn wsd-btn--danger-ghost" onClick={handleDeleteInviteLink}>
                  Delete link
                </button>
              </div>
            </div>
          )}

          {pendingInvites.length === 0 ? (
            <div className="wsd-empty">
              <div className="wsd-empty-icon">⌁</div>
              <strong>No pending invites</strong>
              <p>Send member invites or create a reusable link to see them here.</p>
            </div>
          ) : (
            <div className="wsd-invite-list">
              {pendingInvites.map((invite) => (
                <div key={invite._id} className="wsd-invite-row">
                  <div className="wsd-invite-email">{invite.email}</div>
                  <div className="wsd-invite-meta">{invite.isReusable ? 'Reusable link' : 'Email invite'}</div>
                  <div className={`wsd-invite-status wsd-invite-status--${getInviteStatusMeta(invite).tone}`}>
                    {getInviteStatusMeta(invite).label}
                  </div>
                  <div className="wsd-invite-meta">{invite.isReusable ? `${invite.uses}/${invite.maxUses || '∞'}` : '1/1'}</div>
                  <div className="wsd-invite-meta">{invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : 'N/A'}</div>
                  <div className="wsd-inline-actions wsd-inline-actions--compact">
                    <button
                      type="button"
                      className="wsd-btn wsd-btn--ghost"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        copyPendingInviteLink(invite.token);
                      }}
                      disabled={!invite.token}
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      className="wsd-btn wsd-btn--danger-ghost"
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
      </div>
    );
  };

  const renderMemberRows = () => (
    <div className="wsd-member-list">
      {members.map((member, index) => (
        <div key={member._id} className="wsd-member-row">
          <div className={`wsd-avatar ${getAvatarToneClass(index)}`}>{getMemberInitials(member)}</div>
          <div className="wsd-member-copy">
            <div className="wsd-member-name">{member.name || member.githubUsername}</div>
            <div className="wsd-member-email">{member.email}</div>
          </div>
          <div className={`wsd-role-pill ${getRoleToneClass(member.role)}`}>{member.role}</div>
          <div className="wsd-member-reviews">
            <span className="wsd-member-review-count">{member.totalReviews ?? member.reviewsThisMonth ?? 0}</span>
            <span className="wsd-member-review-label"> {member.reviewLabel || 'reviews'}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMemberReviewsCard = () => (
    <div className="wsd-card">
      <div className="wsd-card__header">
        <span>Your PR reviews</span>
        <span className="wsd-mini-count">{reviewedMembers.length}</span>
      </div>
      <div className="wsd-card__body">
        <MemberPRReviews workspaceId={id} />
      </div>
    </div>
  );

  const renderMemberRepoCard = () => {
    const hasRepo = Boolean(workspace.repoUrl || workspace.repoFullName);
    const repoHref = workspace.repoUrl || (workspace.repoFullName ? `https://github.com/${workspace.repoFullName}` : null);

    return (
      <div className="wsd-card">
        <div className="wsd-card__header">
          <span>Project repository</span>
        </div>
        <div className="wsd-card__body">
          {hasRepo ? (
            <>
              <div className="wsd-repo-shell">
                <div className="wsd-repo-icon" aria-hidden="true">GH</div>
                <div className="wsd-repo-copy">
                  <div className="wsd-repo-name">{repoName}</div>
                  <div className="wsd-repo-subtitle">Linked project repository</div>
                </div>
                {repoHref && (
                  <a href={repoHref} target="_blank" rel="noopener noreferrer" className="wsd-btn wsd-btn--ghost wsd-repo-link">
                    Open on GitHub
                  </a>
                )}
              </div>
              <p className="wsd-help-text">Open a pull request on GitHub and your manager will review it in the workspace dashboard.</p>
            </>
          ) : (
            <div className="wsd-empty wsd-empty--compact">
              <div className="wsd-empty-icon">⌁</div>
              <strong>No repository linked yet</strong>
              <p>Ask a workspace owner to connect the project repository before opening PR reviews.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="workspace-detail-page">
      <BackButton fallback="/workspace" />

      <div className="wsd-page">
        <div className="wsd-header">
          <div className="wsd-title-area">
            <h1 className="wsd-title">{workspace.name}</h1>
            <div className="wsd-badges">
              <span className="wsd-plan-badge">{workspace.plan} plan</span>
              {isMember ? (
                <span className={`wsd-role-pill ${getRoleToneClass(requestingUserRole)}`}>Member</span>
              ) : (
                <span className={`wsd-role-pill ${getRoleToneClass(requestingUserRole)}`}>{requestingUserRole}</span>
              )}
              {repoName && <span className="wsd-repo-badge">{repoName}</span>}
            </div>
          </div>

          <div className="wsd-actions">
            {isOwnerOrAdmin && (
              <>
                <button type="button" onClick={() => setShowInviteModal(true)} className="wsd-btn wsd-btn--ghost" disabled={isSending || isGeneratingLink}>
                  Invite member
                </button>
                <button type="button" onClick={handleOpenDashboard} className="wsd-btn wsd-btn--primary">
                  Open Dashboard
                </button>
              </>
            )}
            <button type="button" onClick={handleLeaveWorkspace} className="wsd-btn wsd-btn--danger-ghost">
              Leave workspace
            </button>
          </div>
        </div>

        {error && <div className="wsd-error-banner">{error}</div>}

        {isOwnerOrAdmin && (
          <div className="wsd-stat-row">
            {statCards.map((stat) => (
              <div key={stat.label} className={`wsd-stat-card wsd-stat-card--${stat.tone}`}>
                <div className="wsd-stat-label">{stat.label}</div>
                <div className="wsd-stat-value">{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="wsd-two-col">
          {isOwnerOrAdmin ? (
            <>
              <div className="wsd-col-left">
                <div className="wsd-card">
                  <div className="wsd-card__header">
                    <span>Team members</span>
                    <span className="wsd-mini-count">{members.length}</span>
                  </div>
                  <div className="wsd-card__body">
                    {members.length === 0 ? (
                      <div className="wsd-empty wsd-empty--compact">
                        <div className="wsd-empty-icon">⌁</div>
                        <strong>No members yet</strong>
                        <p>Invite teammates so the workspace can start collecting reviews.</p>
                      </div>
                    ) : (
                      renderMemberRows()
                    )}
                  </div>
                </div>
              </div>

              <div className="wsd-col-right">{renderRepoCard({ readOnly: false })}</div>
            </>
          ) : (
            <>
              <div className="wsd-col-left">
                {renderHowItWorksCard()}
                {renderMemberRepoCard()}
              </div>
              <div className="wsd-col-right">{renderMemberReviewsCard()}</div>
            </>
          )}
        </div>

        {isOwnerOrAdmin && renderPendingInvitesCard()}
      </div>

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
        inviteResults={inviteResults}
        workspaceName={workspace.name}
      />
    </div>
  );
}

export default WorkspaceDetailPage;
