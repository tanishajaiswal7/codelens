import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspaceApi } from '../../api/workspaceApi';
import { pollJob } from '../../utils/jobPoller';
import './WorkspacePRList.css';

const personaLabels = {
  faang: 'FAANG',
  startup: 'Startup',
  security: 'Security',
};

export default function WorkspacePRList({ workspaceId, onReviewComplete, refreshSignal = 0, canDeletePR = false }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);
  const [reviewingPR, setReviewingPR] = useState(null);
  const [deletingPR, setDeletingPR] = useState(null);
  const [completedReviews, setCompletedReviews] = useState({});
  const [activeReviewReport, setActiveReviewReport] = useState(null);
  const [persona, setPersona] = useState('security');

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    workspaceApi
      .getOpenPRs(workspaceId)
      .then((prResult) => {
        setData(prResult);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load PRs');
        setErrorDetail(err.response?.data?.detail || null);
        setIsLoading(false);
      });
  }, [workspaceId, refreshSignal]);

  const handleReview = async (prNumber) => {
    setReviewingPR(prNumber);
    try {
      const { jobId } = await workspaceApi.reviewPR(workspaceId, prNumber, persona, null);
      pollJob(
        jobId,
        (result) => {
          setCompletedReviews((prev) => ({ ...prev, [prNumber]: result }));
          const reviewedPR = data?.pulls?.find((item) => item.prNumber === prNumber);
          setActiveReviewReport({
            ...result,
            prNumber,
            prTitle: reviewedPR?.title || `PR #${prNumber}`,
            authorLogin: reviewedPR?.authorLogin || 'Unknown',
            branch: reviewedPR?.branch || '',
            baseBranch: reviewedPR?.baseBranch || '',
          });
          setReviewingPR(null);
          setData((current) => ({
            ...current,
            pulls: (current?.pulls || []).map((item) =>
              item.prNumber === prNumber
                ? {
                    ...item,
                    isReviewed: true,
                    reviewResult: {
                      reviewId: result.reviewId,
                      verdict: result.verdict,
                      createdAt: new Date().toISOString(),
                    },
                  }
                : item
            ),
          }));
          if (onReviewComplete) onReviewComplete();
        },
        (err) => {
          setError(err);
          setReviewingPR(null);
        }
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Review failed');
      setReviewingPR(null);
    }
  };

  const handleDelete = async (prNumber) => {
    const confirmed = window.confirm(`Delete PR #${prNumber} from this workspace dashboard?`);
    if (!confirmed) return;

    setDeletingPR(prNumber);
    try {
      await workspaceApi.deletePR(workspaceId, prNumber);
      setData((current) => ({
        ...current,
        pulls: (current?.pulls || []).filter((pr) => pr.prNumber !== prNumber),
      }));
      if (onReviewComplete) onReviewComplete();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete PR');
    } finally {
      setDeletingPR(null);
    }
  };

  if (isLoading) {
    return <div className="wpr-loading">Loading pull requests from GitHub...</div>;
  }

  if (error) {
    const normalizedError = (error || '').toLowerCase();
    const isNoRepoLinked = normalizedError.includes('no github repo linked');

    if (isNoRepoLinked) {
      return (
        <div className="no-repo-state">
          <div className="no-repo-icon">🔗</div>
          <h3 className="no-repo-title">Link a GitHub repository</h3>
          <p className="no-repo-desc">
            Connect a GitHub repo to start reviewing your team&apos;s
            pull requests from this dashboard.
          </p>
          <button
            className="no-repo-btn"
            onClick={() => navigate(`/workspace/${workspaceId}`)}
            type="button"
          >
            Go to workspace settings →
          </button>
        </div>
      );
    }

    return (
      <div className="wpr-error">
        <strong>{error}</strong>
        {errorDetail && (
          <p className="wpr-error-detail">{errorDetail}</p>
        )}
        {error.includes('GitHub') && <p className="wpr-error-hint">Go to Settings → Connect your GitHub account first.</p>}
        {error.includes('repo') && <p className="wpr-error-hint">Add a GitHub repo link to this workspace in settings.</p>}
      </div>
    );
  }

  if (!data?.pulls?.length) {
    return (
      <div className="wpr-empty">
        <div className="wpr-empty-icon">⌁</div>
        <p>No open pull requests found</p>
        <p className="wpr-empty-sub">When your team opens PRs on GitHub, they will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="wpr-container">
      <div className="wpr-repo-header">
        <div>
          <span className="wpr-repo-name">{data.repoFullName}</span>
          <div className="wpr-repo-subtitle">Linked repository</div>
        </div>
        <span className="wpr-pr-count">{data.pulls.length} open PRs</span>
      </div>

      <div className="wpr-persona-bar">
        <span className="wpr-persona-label">Review persona:</span>
        {['faang', 'startup', 'security'].map((value) => (
          <button
            key={value}
            type="button"
            className={`wpr-persona-btn ${persona === value ? 'active' : ''}`}
            onClick={() => setPersona(value)}
          >
            {personaLabels[value]}
          </button>
        ))}
      </div>

      <div className="wpr-list">
        {data.pulls.map((pr) => {
          const result = completedReviews[pr.prNumber] || pr.reviewResult;
          const isReviewing = reviewingPR === pr.prNumber;

          return (
            <div key={pr.prNumber} className="wpr-pr-row">
              <div className="wpr-pr-info">
                <div className="wpr-pr-top">
                  <span className="wpr-pr-num">#{pr.prNumber}</span>
                  <span className="wpr-pr-title">{pr.title}</span>
                </div>
                <div className="wpr-pr-meta">
                  <span className="wpr-pr-author">by {pr.authorName || pr.authorLogin || 'Unknown'}</span>
                  <span className="wpr-pr-branch">
                    {pr.branch} → {pr.baseBranch}
                  </span>
                  {pr.isReviewed && pr.reviewResult?.createdAt && (
                    <span className="wpr-reviewed-at">
                      Reviewed {new Date(pr.reviewResult.createdAt).toLocaleDateString()}
                    </span>
                  )}
                  <span className="wpr-pr-files">
                    {pr.changedFiles} files · +{pr.additions} -{pr.deletions}
                  </span>
                </div>
              </div>

              <div className="wpr-pr-action">
                <div className="wpr-action-stack">
                  {pr.isReviewed ? (
                    <button
                      className="wpr-re-review-btn"
                      type="button"
                      onClick={() => handleReview(pr.prNumber)}
                      disabled={!!reviewingPR}
                      title="Review again to update"
                    >
                      {isReviewing ? (
                        <>
                          <span className="wpr-spinner" />
                          Reviewing...
                        </>
                      ) : (
                        'Re-review'
                      )}
                    </button>
                  ) : (
                    <button className="wpr-review-btn" type="button" onClick={() => handleReview(pr.prNumber)} disabled={!!reviewingPR || deletingPR === pr.prNumber}>
                      {isReviewing ? (
                        <>
                          <span className="wpr-spinner" />
                          Reviewing...
                        </>
                      ) : (
                        'Review PR'
                      )}
                    </button>
                  )}
                  {result && (
                    <div className="wpr-result">
                      <span className={`wpr-verdict wpr-verdict--${result.verdict}`}>
                        {result.verdict === 'approved'
                          ? 'Approved'
                          : result.verdict === 'needs_revision'
                          ? 'Needs revision'
                          : 'Minor issues'}
                      </span>
                      <span className="wpr-issue-count">{result.suggestions?.length || 0} issues</span>
                    </div>
                  )}

                  {canDeletePR && (
                    <button
                      className="wpr-delete-btn"
                      type="button"
                      onClick={() => handleDelete(pr.prNumber)}
                      disabled={isReviewing || !!reviewingPR || deletingPR === pr.prNumber}
                    >
                      {deletingPR === pr.prNumber ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activeReviewReport && (
        <div className="wpr-report-overlay" onClick={() => setActiveReviewReport(null)}>
          <div className="wpr-report-modal" onClick={(event) => event.stopPropagation()}>
            <div className="wpr-report-header">
              <div>
                <div className="wpr-report-kicker">PR review report</div>
                <h3 className="wpr-report-title">{activeReviewReport.prTitle}</h3>
                <div className="wpr-report-subtitle">
                  #{activeReviewReport.prNumber} by {activeReviewReport.authorLogin}
                  {activeReviewReport.branch ? ` · ${activeReviewReport.branch} → ${activeReviewReport.baseBranch}` : ''}
                </div>
              </div>
              <button type="button" className="wpr-report-close" onClick={() => setActiveReviewReport(null)}>✕</button>
            </div>

            <div className="wpr-report-body">
              <div className={`wpr-report-banner wpr-report-banner--${activeReviewReport.verdict}`}>
                <div className="wpr-report-banner-title">
                  {activeReviewReport.verdict === 'approved' ? 'Approved' : activeReviewReport.verdict === 'needs_revision' ? 'Needs revision' : 'Minor issues'}
                </div>
                <div className="wpr-report-banner-summary">{activeReviewReport.summary}</div>
              </div>

              <div className="wpr-report-stats">
                <div className="wpr-report-stat">
                  <span className="wpr-report-stat-label">Issues</span>
                  <span className="wpr-report-stat-value">{activeReviewReport.suggestions?.length || 0}</span>
                </div>
                <div className="wpr-report-stat">
                  <span className="wpr-report-stat-label">Critical</span>
                  <span className="wpr-report-stat-value red">
                    {activeReviewReport.suggestions?.filter((s) => s.severity === 'critical').length || 0}
                  </span>
                </div>
              </div>

              {activeReviewReport.suggestions?.length > 0 ? (
                <div className="wpr-report-list">
                  {activeReviewReport.suggestions.map((suggestion) => (
                    <div key={suggestion.id || suggestion.title} className={`wpr-report-item wpr-report-item--${suggestion.severity || 'info'}`}>
                      <div className="wpr-report-item-top">
                        <span className="wpr-report-item-severity">{suggestion.severity || 'info'}</span>
                        <span className="wpr-report-item-title">{suggestion.title}</span>
                      </div>
                      {suggestion.description && <p className="wpr-report-item-desc">{suggestion.description}</p>}
                      {suggestion.lineRef && <div className="wpr-report-item-line">{suggestion.lineRef}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="wpr-report-clean">No issues were found in this review.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}