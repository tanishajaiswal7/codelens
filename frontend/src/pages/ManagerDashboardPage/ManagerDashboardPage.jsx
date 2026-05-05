import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboardApi';
import { workspaceApi } from '../../api/workspaceApi';
import ReleaseReportModal from '../../components/ReleaseReportModal/ReleaseReportModal';
import WorkspacePRList from '../../components/WorkspacePRList/WorkspacePRList';
import NotificationBell from '../../components/NotificationBell/NotificationBell';
import './ManagerDashboardPage.css';

const verdictDisplay = {
  ready: { label: 'Ready to ship', className: 'ready' },
  not_ready: { label: 'Not ready', className: 'not-ready' },
  needs_review: { label: 'Needs review', className: 'needs-review' },
};

const timeAgo = (value) => {
  if (!value) return 'Just now';
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const verdictTone = (verdict) => {
  if (verdict === 'approved') return 'approved';
  if (verdict === 'minor_issues') return 'amber';
  if (verdict === 'needs_revision' || verdict === 'rejected') return 'red';
  return 'neutral';
};

const verdictLabel = (verdict) => {
  if (verdict === 'approved') return 'Approved';
  if (verdict === 'minor_issues') return 'Minor issues';
  if (verdict === 'needs_revision' || verdict === 'rejected') return 'Changes requested';
  return 'Under review';
};

const formatIssueCount = (count) => `${count || 0} issue${count === 1 ? '' : 's'}`;

const getQualityBadge = (score, criticalCount) => {
  if (score === null || score === undefined) {
    return { label: 'No reviews yet', class: 'neutral' };
  }
  if (criticalCount > 0) {
    return {
      label: `${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} - needs attention`,
      class: 'danger',
    };
  }
  if (score === 0) {
    return { label: 'All PRs need revision', class: 'danger' };
  }
  if (score < 50) {
    return { label: 'Low quality - review needed', class: 'danger' };
  }
  if (score < 80) {
    return { label: 'Some issues found', class: 'warning' };
  }
  if (score < 100) {
    return { label: 'Good quality', class: 'success' };
  }
  return { label: 'All PRs approved', class: 'success' };
};

const ManagerDashboardPage = () => {
  const { id: workspaceId } = useParams();
  const [stats, setStats] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [prs, setPrs] = useState([]);
  const [reviewedPRs, setReviewedPRs] = useState([]);
  const [selectedPRs, setSelectedPRs] = useState([]);
  const [sprintName, setSprintName] = useState('');
  const [selectedPRForReport, setSelectedPRForReport] = useState('all');
  const [reports, setReports] = useState([]);
  const [expandedPR, setExpandedPR] = useState(null);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [prListRefreshSignal, setPrListRefreshSignal] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [decisionFeedbacks, setDecisionFeedbacks] = useState({});
  const [cleanupDone, setCleanupDone] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);

  useEffect(() => {
    setCleanupDone(false);
    loadData();
  }, [workspaceId]);

  const loadData = async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      const [statsResult, prsResult, reportsResult, reviewedResult] = await Promise.allSettled([
        dashboardApi.getStats(workspaceId),
        dashboardApi.getAllPRs(workspaceId),
        dashboardApi.getReports(workspaceId),
        workspaceApi.getReviewedPRs(workspaceId),
      ]);

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.stats);
        setUserRole(statsResult.value.userRole);
      } else {
        console.error('Failed to load dashboard stats:', statsResult.reason);
        setError('Failed to load dashboard stats.');
      }

      if (prsResult.status === 'fulfilled') {
        setPrs(prsResult.value);
      } else {
        console.error('Failed to load PRs:', prsResult.reason);
        setError((prev) => prev || 'Failed to load team PRs.');
      }

      if (reportsResult.status === 'fulfilled') {
        setReports(reportsResult.value);
      } else {
        console.error('Failed to load reports:', reportsResult.reason);
      }

      if (reviewedResult.status === 'fulfilled') {
        setReviewedPRs(reviewedResult.value);
      } else {
        setReviewedPRs([]);
      }

      if (!cleanupDone) {
        setCleanupDone(true);
        dashboardApi
          .cleanupDuplicates(workspaceId)
          .then(async (result) => {
            if (result.deleted > 0) {
              console.log(`Cleaned ${result.deleted} duplicate reviews`);
              const [freshStats, freshPRs, freshReviewedPRs] = await Promise.all([
                dashboardApi.getStats(workspaceId),
                dashboardApi.getAllPRs(workspaceId),
                workspaceApi.getReviewedPRs(workspaceId),
              ]);
              setStats(freshStats.stats);
              setUserRole(freshStats.userRole);
              setPrs(freshPRs);
              setReviewedPRs(freshReviewedPRs);
            }
          })
          .catch(() => {});
      }
    } catch (loadError) {
      console.error('Unexpected dashboard load error:', loadError);
      setError('Failed to load dashboard data.');
    } finally {
      setPrListRefreshSignal((prev) => prev + 1);
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handlePRSelect = (prId) => {
    setSelectedPRs((prev) => (prev.includes(prId) ? prev.filter((id) => id !== prId) : [...prev, prId]));
  };

  const handleGenerateReport = async () => {
    if (!sprintName.trim() || reviewedPRs.length === 0) return;

    setGenerating(true);
    try {
      const report = await dashboardApi.generateReport(
        workspaceId,
        sprintName.trim(),
        selectedPRForReport
      );
      setGeneratedReport(report);
      setShowReportModal(true);
      const reportsData = await dashboardApi.getReports(workspaceId);
      setReports(reportsData);
    } catch (reportError) {
      console.error('Failed to generate report:', reportError);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    const confirmed = window.confirm('Delete this generated report?');
    if (!confirmed) return;

    setDeletingReportId(reportId);
    try {
      await dashboardApi.deleteReport(workspaceId, reportId);
      setReports((prev) => prev.filter((report) => report.id !== reportId));
      if (viewingReport?.id === reportId) {
        setViewingReport(null);
      }
    } catch (deleteError) {
      console.error('Failed to delete report:', deleteError);
    } finally {
      setDeletingReportId(null);
    }
  };

  const handleDecision = async (reviewId, prNumber, decision) => {
    setIsDeciding(true);
    try {
      await dashboardApi.makeDecision(workspaceId, reviewId, decision, decisionFeedbacks[prNumber] || '');
      setDecisionFeedbacks((prev) => ({ ...prev, [prNumber]: '' }));
      setPrs((prev) =>
        prev.map((pr) =>
          pr.id === reviewId
            ? {
                ...pr,
                managerDecision: decision,
                reviewResult: {
                  ...(pr.reviewResult || {}),
                  managerDecision: decision,
                  managerFeedback: decisionFeedbacks[prNumber] || '',
                },
              }
            : pr
        )
      );
      const updated = await dashboardApi.getStats(workspaceId);
      setStats(updated.stats);
      setUserRole(updated.userRole);
    } catch (decisionError) {
      alert(decisionError.response?.data?.error || 'Failed to save decision');
    } finally {
      setIsDeciding(false);
    }
  };

  const resolveAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return '';
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('blob:')) {
      return avatarUrl;
    }
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${avatarUrl}`;
  };

  const filteredPRs = prs.filter((pr) => {
    if (filter === 'All') return true;
    if (filter === 'Critical') return pr.criticalCount > 0;
    if (filter === 'Approved') return pr.verdict === 'approved';
    return true;
  });

  const recentNotifications = prs.slice(0, 5);
  const hasReviewedPRs = reviewedPRs.length > 0;
  const hasLinkedRepo = Boolean(stats?.repoFullName);
  const memberStats = Array.isArray(stats?.memberStats) ? stats.memberStats : [];
  const reportButtonLabel = hasReviewedPRs ? (generating ? 'Generating...' : 'Generate report') : 'Review at least one PR first';
  const selectedCount = selectedPRs.length;
  const qualityBadge = getQualityBadge(stats?.qualityScore, stats?.criticalCount);

  const statCards = [
    { label: 'Open PRs', value: stats?.totalOpenPRs ?? 0, tone: 'neutral' },
    { label: 'Reviewed PRs', value: stats?.reviewedPrCount ?? 0, tone: 'neutral' },
    { label: 'Critical issues', value: stats?.criticalCount ?? 0, tone: (stats?.criticalCount ?? 0) > 0 ? 'red' : 'neutral' },
    { label: 'Quality score', value: `${stats?.qualityScore ?? 0}%`, tone: (stats?.qualityScore ?? 0) >= 80 ? 'green' : 'neutral' },
  ];

  if (loading) return <div className="manager-dashboard loading">Loading dashboard...</div>;

  if (error && !stats) {
    return (
      <div className="manager-dashboard-error">
        <h2>Dashboard unavailable</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="manager-dashboard-page">
      <div className="mdb-hero">
        <div className="mdb-hero-copy">
          <p className="mdb-kicker">Manager dashboard</p>
          <h1>{stats?.workspaceName || 'Workspace'}</h1>
          <p className="mdb-copy">
            Monitor team review velocity, prioritize risky pull requests, and keep release decisions visible in one workspace.
          </p>
          <div className="mdb-context-row">
            <span className="mdb-context-label">Workspace</span>
            <strong className="mdb-context-value">{stats?.workspaceName || 'Workspace'}</strong>
            {hasLinkedRepo ? (
              <span className="mdb-repo-chip">{stats.repoFullName}</span>
            ) : (
              <span className="mdb-repo-chip mdb-repo-chip--warning">No repository linked yet</span>
            )}
            <span className={`quality-badge quality-badge--${qualityBadge.class}`}>
              {qualityBadge.label}
            </span>
          </div>
        </div>
        <div className="mdb-hero-actions">
          {userRole !== 'member' && <NotificationBell workspaceId={workspaceId} />}
          <button type="button" className="mdb-btn mdb-btn--ghost" onClick={loadData} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Refresh dashboard'}
          </button>
        </div>
      </div>

      <div className="mdb-stat-row">
        {statCards.map((card) => (
          <div key={card.label} className={`mdb-stat-card mdb-stat-card--${card.tone}`}>
            <div className="mdb-stat-label">{card.label}</div>
            {card.label === 'Quality score' ? (
              stats?.qualityScore === null ? (
                <div>
                  <span className="stat-val stat-nodata">—</span>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>No reviews yet</div>
                </div>
              ) : (
                <span className={`stat-val ${
                  stats.qualityScore >= 80 ? 'green' :
                  stats.qualityScore >= 50 ? 'amber' : 'red'
                }`}>
                  {stats.qualityScore}%
                </span>
              )
            ) : (
              <div className="mdb-stat-value">{card.value}</div>
            )}
          </div>
        ))}
      </div>

      <div className="mdb-grid">
        <section className="mdb-card mdb-card--reviews">
          <div className="mdb-card__header">
            <div>
              <h2>Pull request reviews</h2>
              <p className="mdb-card-subtitle">Review your team's open PRs before merging.</p>
            </div>
            <div className="mdb-chip-row">
              {['All', 'Critical', 'Approved'].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`mdb-filter-chip ${filter === value ? 'active' : ''}`}
                  onClick={() => setFilter(value)}
                >
                  {value}
                </button>
              ))}
              {selectedCount > 0 && <span className="mdb-selection-pill">{selectedCount} selected</span>}
            </div>
          </div>
          <div className="mdb-card__body">
            {filteredPRs.length === 0 ? (
              <div className="mdb-empty">
                <div className="mdb-empty-icon">⌁</div>
                <strong>No PRs found</strong>
                <p>Try a different filter or refresh the workspace to show the latest team activity.</p>
                <button type="button" className="mdb-btn mdb-btn--ghost" onClick={loadData}>
                  Refresh data
                </button>
              </div>
            ) : (
              <div className="mdb-pr-list">
                {filteredPRs.map((pr) => {
                  const isExpanded = expandedPR === pr.prNumber;
                  const issueCount = pr.totalIssues || 0;
                  const criticalCount = pr.criticalCount || 0;

                  return (
                    <div key={pr.id} className={`mdb-pr-item ${isExpanded ? 'is-open' : ''}`}>
                      <div
                        className={`mdb-pr-row ${pr.prNumber ? 'clickable' : ''}`}
                        onClick={() => {
                          if (pr.prNumber) {
                            setExpandedPR((prev) => (prev === pr.prNumber ? null : pr.prNumber));
                          }
                        }}
                        role="button"
                        tabIndex={pr.prNumber ? 0 : -1}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            if (pr.prNumber) {
                              setExpandedPR((prev) => (prev === pr.prNumber ? null : pr.prNumber));
                            }
                          }
                        }}
                      >
                        <div className="mdb-pr-main">
                          <span className="mdb-pr-num">#{pr.prNumber}</span>
                          <div className="mdb-pr-copy">
                            <strong>{pr.prTitle}</strong>
                            <span>
                              by {pr.authorName || 'Unknown'} · {formatIssueCount(issueCount)}
                              {criticalCount > 0 ? ` · ${criticalCount} critical` : ''}
                              {pr.createdAt ? ` · Reviewed ${new Date(pr.createdAt).toLocaleDateString()}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="mdb-pr-side">
                          <span className={`mdb-critical-chip ${criticalCount > 0 ? 'is-hot' : ''}`}>
                            {criticalCount > 0 ? `${criticalCount} critical` : 'No critical issues'}
                          </span>
                          <span className={`mdb-verdict-badge mdb-verdict-badge--${verdictTone(pr.verdict)}`}>
                            {verdictLabel(pr.verdict)}
                          </span>
                          {pr.prNumber && <span className="expand-hint">{isExpanded ? '▲ Hide' : '▼ Review details'}</span>}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mdb-pr-expanded" onClick={(event) => event.stopPropagation()}>
                          <div className="mdb-expansion-label">Review decision</div>
                          <textarea
                            className="mdb-feedback-input"
                            rows={2}
                            placeholder="Write feedback for the developer (optional)..."
                            value={decisionFeedbacks[pr.prNumber] || ''}
                            onChange={(event) =>
                              setDecisionFeedbacks((prev) => ({
                                ...prev,
                                [pr.prNumber]: event.target.value,
                              }))
                            }
                          />
                          <div className="mdb-decision-actions">
                            <button
                              type="button"
                              className="mdb-decision-btn mdb-decision-btn--approve"
                              onClick={() => handleDecision(pr.id, pr.prNumber, 'approved')}
                              disabled={isDeciding}
                            >
                              Approve — ready to merge
                            </button>
                            <button
                              type="button"
                              className="mdb-decision-btn mdb-decision-btn--reject"
                              onClick={() => handleDecision(pr.id, pr.prNumber, 'rejected')}
                              disabled={isDeciding}
                            >
                              Request changes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mdb-card mdb-card--notifications">
          <div className="mdb-card__header">
            <div>
              <h2>Recent notifications</h2>
              <p className="mdb-card-subtitle">Review decisions and updates from the latest PR activity.</p>
            </div>
          </div>
          <div className="mdb-card__body">
            {recentNotifications.length === 0 ? (
              <div className="mdb-empty mdb-empty--compact">
                <div className="mdb-empty-icon">⌁</div>
                <strong>No recent activity</strong>
                <p>Once PRs are reviewed, the latest notifications will appear here.</p>
              </div>
            ) : (
              <div className="mdb-notification-list">
                {recentNotifications.map((pr) => {
                  const tone = verdictTone(pr.verdict);
                  const message =
                    pr.verdict === 'approved'
                      ? `PR #${pr.prNumber} was approved`
                      : pr.verdict === 'minor_issues'
                      ? `PR #${pr.prNumber} has minor issues to review`
                      : pr.verdict === 'needs_revision'
                      ? `PR #${pr.prNumber} needs changes`
                      : `PR #${pr.prNumber} is under review`;

                  return (
                    <div key={pr.id} className="mdb-notification-row">
                      <span className={`mdb-notification-dot mdb-notification-dot--${tone}`} />
                      <div className="mdb-notification-copy">{message}</div>
                      <div className="mdb-notification-time">{timeAgo(pr.createdAt)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mdb-secondary-grid">
        <section className="mdb-card">
          <div className="mdb-card__header">
            <div>
              <h2>Open pull requests</h2>
              <p className="mdb-card-subtitle">Live pull requests pulled from the linked repository.</p>
            </div>
            {selectedCount > 0 && <span className="mdb-selection-pill">{selectedCount} selected</span>}
          </div>
          <div className="mdb-card__body">
            <WorkspacePRList
              workspaceId={workspaceId}
              canDeletePR={userRole === 'owner'}
              refreshSignal={prListRefreshSignal}
              onReviewComplete={() => {
                dashboardApi
                  .getStats(workspaceId)
                  .then((result) => {
                    setStats(result.stats);
                    setUserRole(result.userRole);
                    setPrListRefreshSignal((prev) => prev + 1);
                  })
                  .catch((err) => {
                    console.error('Failed to refresh stats after PR review:', err);
                  });
              }}
            />
            {!hasLinkedRepo && <div className="mdb-guide-note">Link a GitHub repository from Workspace Detail page to load open pull requests here.</div>}
            {hasLinkedRepo && !hasReviewedPRs && <div className="mdb-guide-note">Start by reviewing one PR. After the first completed review, team metrics and release readiness report will populate automatically.</div>}
          </div>
        </section>

        <section className="mdb-card">
          <div className="mdb-card__header">
            <div>
              <h2>Release reports</h2>
              <p className="mdb-card-subtitle">Generate a sprint verdict from completed workspace reviews.</p>
            </div>
          </div>
          <div className="mdb-card__body">
            <div className="mdb-report-controls">
              <div className="mdb-report-input-wrap">
                <label htmlFor="sprint-name" className="mdb-sprint-label">Sprint name</label>
                <input
                  id="sprint-name"
                  type="text"
                  placeholder="e.g. Sprint 12"
                  value={sprintName}
                  onChange={(event) => setSprintName(event.target.value)}
                  className="mdb-sprint-input"
                />

                <label htmlFor="review-selector" className="mdb-sprint-label mdb-report-select-label">Reviewed PR</label>
                <select
                  id="review-selector"
                  value={selectedPRForReport}
                  onChange={(event) => setSelectedPRForReport(event.target.value)}
                  className="mdb-report-select"
                >
                  <option value="all">All reviewed PRs</option>
                  {reviewedPRs.map((pr) => (
                    <option key={pr.reviewId} value={pr.reviewId}>
                      PR #{pr.prNumber} - {pr.prTitle}
                      {pr.criticalCount > 0 ? ` (${pr.criticalCount} critical)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={!sprintName.trim() || reviewedPRs.length === 0 || generating}
                className="mdb-btn mdb-btn--primary"
                title={
                  reviewedPRs.length === 0
                    ? 'Review at least one PR before generating a report'
                    : 'Generate sprint release report'
                }
              >
                {reportButtonLabel}
              </button>
            </div>
            {reviewedPRs.length === 0 && (
              <p className="report-no-data-hint">
                Review at least one PR from the Open pull requests section before generating a report.
              </p>
            )}

            <div className="mdb-past-reports">
              <div className="mdb-past-reports-head">Past reports</div>
              {reports.length === 0 ? (
                <div className="mdb-empty mdb-empty--compact">
                  <div className="mdb-empty-icon">⌁</div>
                  <strong>No reports generated yet</strong>
                  <p>Complete PR reviews and generate your first release report for this workspace.</p>
                </div>
              ) : (
                <div className="mdb-report-list">
                  {reports.map((report) => {
                    const verdict = verdictDisplay[report.verdict] || {
                      label: report.verdict,
                      className: 'unknown',
                    };

                    return (
                      <div key={report.id} className="mdb-report-row">
                        <span className="mdb-report-name">{report.sprintName}</span>
                        <span className={`report-badge report-badge--${verdict.className}`}>
                          {verdict.label}
                        </span>
                        <span className="mdb-report-date">{new Date(report.createdAt).toLocaleDateString()}</span>
                        <div className="report-row-actions">
                          <button
                            type="button"
                            className="report-view-btn"
                            onClick={() => setViewingReport(report)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="report-delete-btn"
                            onClick={() => handleDeleteReport(report.id)}
                            disabled={deletingReportId === report.id}
                          >
                            {deletingReportId === report.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {memberStats.length > 0 && (
        <section className="mdb-card mdb-card--members">
          <div className="mdb-card__header">
            <div>
              <h2>Team members</h2>
              <p className="mdb-card-subtitle">Review contribution trends, roles, and ownership at a glance.</p>
            </div>
          </div>
          <div className="mdb-card__body">
            <div className="mdb-member-grid">
              {memberStats.map((member) => (
                <div key={member.userId} className="mdb-member-card">
                  {member.avatar ? (
                    <img src={resolveAvatarUrl(member.avatar)} alt={member.name} className="mdb-member-avatar" />
                  ) : (
                    <span className="mdb-member-avatar mdb-member-avatar--fallback">
                      {member.name?.split(' ').map((part) => part[0]).join('').toUpperCase()}
                    </span>
                  )}
                  <div className="mdb-member-copy">
                    <div className="mdb-member-name">{member.name}</div>
                    <div className="mdb-member-role">{member.role}</div>
                    <div className="mdb-member-stats">
                      <span>{member.totalReviews} {member.reviewLabel || 'reviews'}</span>
                      <span>{member.avgIssues ?? 0} avg issues</span>
                      {Number(member.criticalIssues || 0) > 0 && (
                        <span className="mdb-severity-critical">critical</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {showReportModal && generatedReport && <ReleaseReportModal report={generatedReport} onClose={() => setShowReportModal(false)} />}

      {viewingReport && (
        <div className="report-modal-overlay" onClick={() => setViewingReport(null)}>
          <div className="report-modal" onClick={(event) => event.stopPropagation()}>
            <div className="report-modal-header">
              <div>
                <h2 className="report-modal-title">{viewingReport.sprintName}</h2>
                <span className="report-modal-date">
                  Generated {new Date(viewingReport.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button className="report-modal-close" onClick={() => setViewingReport(null)}>
                ✕
              </button>
            </div>

            <div className="report-modal-body">
              <div className={`report-verdict-banner report-verdict-banner--${viewingReport.verdict}`}>
                <span className="rvb-emoji">{viewingReport.verdict === 'ready' ? '✅' : '❌'}</span>
                <div>
                  <div className="rvb-title">
                    {viewingReport.verdict === 'ready' ? 'READY TO SHIP' : 'NOT READY TO SHIP'}
                  </div>
                  <div className="rvb-summary">{viewingReport.executiveSummary || viewingReport.summary}</div>
                </div>
              </div>

              <div className="report-stats-row">
                <div className="report-stat">
                  <div className="report-stat-label">Total reviews</div>
                  <div className="report-stat-val">{viewingReport.totalReviews || 0}</div>
                </div>
                <div className="report-stat">
                  <div className="report-stat-label">Quality score</div>
                  <div className="report-stat-val">
                    {viewingReport.qualityScore != null ? `${viewingReport.qualityScore}%` : '—'}
                  </div>
                </div>
                <div className="report-stat">
                  <div className="report-stat-label">Blockers</div>
                  <div className="report-stat-val red">{viewingReport.blockerCount || 0}</div>
                </div>
                <div className="report-stat">
                  <div className="report-stat-label">Warnings</div>
                  <div className="report-stat-val amber">{viewingReport.warningCount || 0}</div>
                </div>
              </div>

              {viewingReport.blockers?.length > 0 && (
                <div className="report-section">
                  <h3 className="report-section-title red">Critical blockers — must fix before shipping</h3>
                  {viewingReport.blockers.map((blocker, index) => (
                    <div key={index} className="report-blocker-item">
                      <div className="rbi-top">
                        <span className="rbi-badge critical">Critical</span>
                        <span className="rbi-title">{blocker.title}</span>
                      </div>
                      {blocker.authorName && (
                        <span className="rbi-meta">
                          By {blocker.authorName}
                          {blocker.criticalCount > 1 ? ` · ${blocker.criticalCount} critical issues` : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {viewingReport.warnings?.length > 0 && (
                <div className="report-section">
                  <h3 className="report-section-title amber">Warnings — recommended to fix</h3>
                  {viewingReport.warnings.map((warning, index) => (
                    <div key={index} className="report-warning-item">
                      <span className="rbi-badge medium">Medium</span>
                      <span className="rbi-title">{warning.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {(!viewingReport.blockers || viewingReport.blockers.length === 0) &&
                (!viewingReport.warnings || viewingReport.warnings.length === 0) && (
                  <div className="report-clean">✅ No blockers or warnings found. This sprint is clean.</div>
                )}
            </div>

            <div className="report-modal-footer">
              <button className="report-print-btn" onClick={() => window.print()}>
                Print report
              </button>
              <button className="report-close-btn" onClick={() => setViewingReport(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboardPage;
