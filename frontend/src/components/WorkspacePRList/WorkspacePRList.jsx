import React, { useState, useEffect } from 'react';
import { workspaceApi } from '../../api/workspaceApi';
import { pollJob } from '../../utils/jobPoller';
import './WorkspacePRList.css';

export default function WorkspacePRList({ workspaceId, onReviewComplete, refreshSignal = 0 }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewingPR, setReviewingPR] = useState(null);
  const [completedReviews, setCompletedReviews] = useState({});
  const [persona, setPersona] = useState('security');

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    workspaceApi.getOpenPRs(workspaceId)
      .then(result => {
        setData(result);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to load PRs');
        setIsLoading(false);
      });
  }, [workspaceId, refreshSignal]);

  const handleReview = async (prNumber) => {
    setReviewingPR(prNumber);
    try {
      const { jobId } = await workspaceApi.reviewPR(
        workspaceId, prNumber, persona
      );
      const cancel = pollJob(
        jobId,
        (result) => {
          setCompletedReviews(prev => ({ ...prev, [prNumber]: result }));
          setReviewingPR(null);
          if (onReviewComplete) onReviewComplete();
        },
        (err) => {
          setError(err);
          setReviewingPR(null);
        }
      );
      return () => cancel();
    } catch (err) {
      setError(err.response?.data?.error || 'Review failed');
      setReviewingPR(null);
    }
  };

  if (isLoading) return (
    <div className="wpr-loading">Loading pull requests from GitHub...</div>
  );

  if (error) return (
    <div className="wpr-error">
      <p>{error}</p>
      {error.includes('GitHub') && (
        <p className="wpr-error-hint">
          Go to Settings → Connect your GitHub account first.
        </p>
      )}
      {error.includes('repo') && (
        <p className="wpr-error-hint">
          Add a GitHub repo link to this workspace in settings.
        </p>
      )}
    </div>
  );

  if (!data?.pulls?.length) return (
    <div className="wpr-empty">
      <p>No open pull requests found in</p>
      <code>{data?.repoFullName || 'the linked repo'}</code>
      <p>When your team opens PRs on GitHub, they will appear here.</p>
    </div>
  );

  return (
    <div className="wpr-container">
      <div className="wpr-repo-header">
        <span className="wpr-repo-name">{data.repoFullName}</span>
        <span className="wpr-pr-count">{data.pulls.length} open PRs</span>
      </div>

      <div className="wpr-persona-bar">
        <span className="wpr-persona-label">Review persona:</span>
        {['faang', 'startup', 'security'].map(p => (
          <button
            key={p}
            className={`wpr-persona-btn ${persona === p ? 'active' : ''}`}
            onClick={() => setPersona(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="wpr-list">
        {data.pulls.map(pr => {
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
                      {result.verdict === 'approved' ? '✅ Approved' :
                       result.verdict === 'needs_revision' ? '❌ Needs revision' :
                       '⚠️ Minor issues'}
                    </span>
                    <span className="wpr-issue-count">
                      {result.suggestions?.length || 0} issues
                    </span>
                  </div>
                ) : (
                  <button
                    className="wpr-review-btn"
                    onClick={() => handleReview(pr.prNumber)}
                    disabled={isReviewing || !!reviewingPR}
                  >
                    {isReviewing ? (
                      <>
                        <span className="wpr-spinner"></span>
                        Reviewing...
                      </>
                    ) : 'Review PR'}
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