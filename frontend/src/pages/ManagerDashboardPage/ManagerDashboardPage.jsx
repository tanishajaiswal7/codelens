import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboardApi';
import StatCard from '../../components/StatCard/StatCard';
import ReleaseReportModal from '../../components/ReleaseReportModal/ReleaseReportModal';
import WorkspacePRList from '../../components/WorkspacePRList/WorkspacePRList';
import NotificationBell from '../../components/NotificationBell/NotificationBell';
import './ManagerDashboardPage.css';

const ManagerDashboardPage = () => {
  const { id: workspaceId } = useParams();
  const [stats, setStats] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [prs, setPrs] = useState([]);
  const [selectedPRs, setSelectedPRs] = useState([]);
  const [sprintName, setSprintName] = useState('');
  const [reports, setReports] = useState([]);
  const [expandedPR, setExpandedPR] = useState(null);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [prListRefreshSignal, setPrListRefreshSignal] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const loadData = async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      const [statsResult, prsResult, reportsResult] = await Promise.allSettled([
        dashboardApi.getStats(workspaceId),
        dashboardApi.getAllPRs(workspaceId),
        dashboardApi.getReports(workspaceId),
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
    } catch (error) {
      console.error('Unexpected dashboard load error:', error);
      setError('Failed to load dashboard data.');
    } finally {
      setPrListRefreshSignal((prev) => prev + 1);
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handlePRSelect = (prId) => {
    setSelectedPRs(prev =>
      prev.includes(prId) ? prev.filter(id => id !== prId) : [...prev, prId]
    );
  };

  const handleGenerateReport = async () => {
    if (!sprintName.trim() || (stats?.reviewedPrCount || 0) === 0) return;

    setGenerating(true);
    try {
      const report = await dashboardApi.generateReport(workspaceId, sprintName.trim());
      setGeneratedReport(report);
      setShowReportModal(true);
      // Reload reports
      const reportsData = await dashboardApi.getReports(workspaceId);
      setReports(reportsData);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getVerdictBadge = (verdict) => {
    const classes = {
      approved: 'badge-ready',
      minor_issues: 'badge-minor',
      needs_revision: 'badge-needs',
    };
    return <span className={`verdict-badge ${classes[verdict] || ''}`}>{verdict.replace('_', ' ')}</span>;
  };

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const resolveAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return '';
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('blob:')) {
      return avatarUrl;
    }
    return `${apiBaseUrl}${avatarUrl}`;
  };

  const filteredPRs = prs.filter(pr => {
    if (filter === 'All') return true;
    if (filter === 'Critical Issues') return pr.criticalCount > 0;
    if (filter === 'Approved') return pr.verdict === 'approved';
    return true;
  });

  const hasNoPRs = filteredPRs.length === 0;
  const hasReviewedPRs = (stats?.reviewedPrCount || 0) > 0;
  const hasLinkedRepo = Boolean(stats?.repoFullName);
  const memberStats = Array.isArray(stats?.memberStats) ? stats.memberStats : [];
  const reportButtonLabel = hasReviewedPRs
    ? (generating ? 'Generating...' : 'Generate Report')
    : 'Review at least one PR first';
  const selectedCount = selectedPRs.length;
  const qualityPhrase = stats?.qualityScore >= 90
    ? 'Excellent review quality'
    : stats?.qualityScore >= 75
    ? 'Healthy review flow'
    : 'Review focus required';

  if (loading) return <div className="loading">Loading dashboard...</div>;

  if (error && !stats) {
    return (
      <div className="manager-dashboard-error">
        <h2>Dashboard unavailable</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      <div className="dashboard-intro">
        <div className="dashboard-intro-copy">
          <p className="dashboard-tag">Manager summary</p>
          <h1>Manager Dashboard</h1>
          <p className="dashboard-copy">
            Monitor your team, prioritize high-risk pull requests, and generate release-ready insights with one view.
          </p>
          <div className="dashboard-context-row">
            <span className="context-label">Workspace</span>
            <strong className="context-value">{stats?.workspaceName || 'Workspace'}</strong>
            {hasLinkedRepo ? (
              <span className="repo-chip">{stats.repoFullName}</span>
            ) : (
              <span className="repo-chip repo-chip-warning">No repository linked yet</span>
            )}
          </div>
        </div>
        <div className="dashboard-highlights">
          {userRole !== 'member' && (
            <NotificationBell workspaceId={workspaceId} />
          )}
          <div className="highlight-pill">{qualityPhrase}</div>
          <div className="highlight-pill">
            {stats?.criticalCount === 0 ? 'No open critical issues' : `${stats.criticalCount} critical issue${stats.criticalCount > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Pull Requests Section */}
      <section className="mdb-section">
        <div className="mdb-section-head">
          <div>
            <h2 className="mdb-section-title">Open Pull Requests</h2>
            <p className="mdb-section-sub">
              Review your team's open PRs before merging
            </p>
          </div>
          <div className="section-actions">
            <span className="selection-pill">
              {selectedCount > 0 ? `${selectedCount} selected` : 'Live from GitHub'}
            </span>
            <button type="button" className="refresh-btn" onClick={loadData} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh dashboard'}
            </button>
          </div>
        </div>
        <WorkspacePRList
          workspaceId={workspaceId}
          refreshSignal={prListRefreshSignal}
          onReviewComplete={() => {
            // Refresh stats when a review completes
            dashboardApi.getStats(workspaceId)
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
        {!hasLinkedRepo && (
          <div className="guide-note">
            Link a GitHub repository from Workspace Detail page to load open pull requests here.
          </div>
        )}
        {hasLinkedRepo && !hasReviewedPRs && (
          <div className="guide-note">
            Start by reviewing one PR. After the first completed review, team metrics and release readiness report will populate automatically.
          </div>
        )}
      </section>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          label="Open PRs"
          value={stats?.totalOpenPRs ?? 0}
          trend="neutral"
        />
        <StatCard
          label="Reviewed PRs"
          value={stats?.reviewedPrCount ?? 0}
          trend="up"
        />
        <StatCard
          label="Critical Issues"
          value={stats?.criticalCount ?? 0}
          trend="down"
          trendValue={(stats?.criticalCount ?? 0) > 0 ? 'Needs attention' : 'Good'}
        />
        <StatCard
          label="Quality Score"
          value={`${stats?.qualityScore ?? 0}%`}
          trend={(stats?.qualityScore ?? 0) >= 80 ? 'up' : 'down'}
        />
        <StatCard
          label="Reviews This Week"
          value={stats?.prsThisWeek ?? 0}
          trend="up"
        />
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* PR Table */}
        <div className="pr-section">
          <div className="section-header">
            <div>
              <h2>Team PR Reviews</h2>
              <p className="section-copy">Track review velocity, highlight risks, and drill into PR details without leaving the dashboard.</p>
            </div>
            <div className="filters">
              {['All', 'Critical Issues', 'Approved'].map(f => (
                <button
                  key={f}
                  className={`filter-chip ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
              {selectedCount > 0 && (
                <span className="selection-pill selection-pill-inline">
                  {selectedCount} selected
                </span>
              )}
            </div>
          </div>

          <div className="pr-table">
            <div className="table-header">
              <div className="col-select"></div>
              <div className="col-title">PR Title</div>
              <div className="col-author">Author</div>
              <div className="col-repo">Repo</div>
              <div className="col-issues">Issues</div>
              <div className="col-verdict">Verdict</div>
              <div className="col-date">Date</div>
            </div>

            {hasNoPRs ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <strong>No PRs found</strong>
                <p>Try a different filter or refresh the workspace to show the latest team activity.</p>
                <button type="button" className="refresh-btn" onClick={loadData}>
                  Refresh data
                </button>
              </div>
            ) : (
              filteredPRs.map(pr => (
                <div key={pr.id} className="pr-row">
                  <div className="col-select">
                    <input
                      type="checkbox"
                      checked={selectedPRs.includes(pr.id)}
                      onChange={() => handlePRSelect(pr.id)}
                      aria-label={`Select PR ${pr.prTitle}`}
                    />
                  </div>
                  <div className="col-title">
                    <div
                      className="pr-title"
                      onClick={() => setExpandedPR(expandedPR === pr.id ? null : pr.id)}
                    >
                      #{pr.prNumber} {pr.prTitle}
                    </div>
                    {expandedPR === pr.id && (
                      <div className="pr-details">
                        {pr.suggestions.map((s, i) => (
                          <div key={i} className="suggestion-item">
                            <span className={`severity-${s.severity}`}>{s.severity}</span>
                            {s.title}: {s.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-author">
                    {pr.authorAvatar ? (
                      <img src={resolveAvatarUrl(pr.authorAvatar)} alt={pr.authorName} className="author-avatar" />
                    ) : (
                      <span className="author-avatar fallback">{pr.authorName?.[0] || 'U'}</span>
                    )}
                    {pr.authorName}
                  </div>
                  <div className="col-repo">{pr.repoFullName}</div>
                  <div className="col-issues">{pr.totalIssues} ({pr.criticalCount} critical)</div>
                  <div className="col-verdict">{getVerdictBadge(pr.verdict)}</div>
                  <div className="col-date">{new Date(pr.createdAt).toLocaleDateString()}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Member Summary */}
        <div className="member-section">
          <div className="section-header section-header-stack">
            <div>
              <h2>Team Members</h2>
              <p className="section-copy">Review contribution trends, roles, and ownership at a glance.</p>
            </div>
          </div>
          {memberStats.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <strong>No member review activity yet</strong>
              <p>Once team members run workspace PR reviews, their contribution summary appears here.</p>
            </div>
          )}
          <div className="member-grid">
          {memberStats.map(member => (
            <div key={member.userId} className="member-card">
              {member.avatar ? (
                <img src={resolveAvatarUrl(member.avatar)} alt={member.name} className="member-avatar" />
              ) : (
                <span className="member-avatar fallback">{member.name?.split(' ').map((part) => part[0]).join('').toUpperCase()}</span>
              )}
              <div className="member-info">
                <div className="member-name">{member.name}</div>
                <div className="member-role">{member.role}</div>
                <div className="member-stats">
                  <span>{member.prCount} PRs</span>
                  <span>{member.avgSuggestions} avg issues</span>
                  <span className={`severity-${member.worstSeverity}`}>{member.worstSeverity}</span>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Release Report Section */}
      <div className="report-section">
        <div className="report-head">
          <div>
            <h2>Generate Release Report</h2>
            <p className="report-help-text">
              Generates a sprint verdict based on workspace-tagged PR reviews only.
            </p>
          </div>
          <div className="report-meta">
            <span className="selection-pill">{stats?.reviewedPrCount ?? 0} reviewed</span>
            <span className="selection-pill">{stats?.totalOpenPRs ?? 0} open</span>
          </div>
        </div>
        <div className="report-controls">
          <div className="report-input-wrap">
            <label htmlFor="sprint-name" className="sprint-label">Sprint name</label>
            <input
              id="sprint-name"
              type="text"
              placeholder="e.g. Sprint 12"
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              className="sprint-input"
            />
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={!sprintName.trim() || generating || !hasReviewedPRs}
            className="generate-btn"
            title={!hasReviewedPRs ? 'Review at least one PR first' : 'Generate sprint release report'}
          >
            {reportButtonLabel}
          </button>
        </div>

        <div className="past-reports">
          <h3>Past Reports</h3>
          {reports.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🧾</div>
              <strong>No reports generated yet</strong>
              <p>Complete PR reviews and generate your first release report for this workspace.</p>
            </div>
          )}
          {reports.map(report => (
            <div key={report.id} className="report-item">
              <span>{report.sprintName}</span>
              <span className={`verdict-badge ${report.verdict}`}>{report.verdict}</span>
              <span>{new Date(report.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>

      {showReportModal && generatedReport && (
        <ReleaseReportModal
          report={generatedReport}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

export default ManagerDashboardPage;