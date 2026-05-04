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

export default function WorkspacePRList({ workspaceId, onReviewComplete, refreshSignal = 0 }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);
  const [reviewingPR, setReviewingPR] = useState(null);
  const [completedReviews, setCompletedReviews] = useState({});
  const [persona, setPersona] = useState('security');

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    workspaceApi
      .getOpenPRs(workspaceId)
      .then((result) => {
        setData(result);
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
      const { jobId } = await workspaceApi.reviewPR(workspaceId, prNumber, persona);
      pollJob(
        jobId,
        (result) => {
          setCompletedReviews((prev) => ({ ...prev, [prNumber]: result }));
          setReviewingPR(null);
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
          const result = completedReviews[pr.prNumber];
          const isReviewing = reviewingPR === pr.prNumber;

          return (
            <div key={pr.prNumber} className="wpr-pr-row">
              <div className="wpr-pr-info">
                <div className="wpr-pr-top">
                  <span className="wpr-pr-num">#{pr.prNumber}</span>
                  <span className="wpr-pr-title">{pr.title}</span>
                </div>
                <div className="wpr-pr-meta">
                  <span className="wpr-pr-author">by {pr.authorLogin}</span>
                  <span className="wpr-pr-branch">
                    {pr.branch} → {pr.baseBranch}
                  </span>
                  <span className="wpr-pr-files">
                    {pr.changedFiles} files · +{pr.additions} -{pr.deletions}
                  </span>
                </div>
              </div>

              <div className="wpr-pr-action">
                {result ? (
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
                ) : (
                  <button className="wpr-review-btn" type="button" onClick={() => handleReview(pr.prNumber)} disabled={isReviewing || !!reviewingPR}>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}