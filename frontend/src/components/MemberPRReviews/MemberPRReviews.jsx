import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import './MemberPRReviews.css';

const getVerdictKey = (review) => review.managerDecision || review.verdict || 'pending';

const getVerdictLabel = (review) => {
  const verdict = getVerdictKey(review);

  if (verdict === 'approved') return 'Approved';
  if (verdict === 'rejected' || verdict === 'needs_revision') return 'Changes requested';
  if (verdict === 'minor_issues') return 'Minor issues';
  return 'Under review';
};

export default function MemberPRReviews({ workspaceId, onCountChange }) {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axiosInstance
      .get(`/api/workspace/${workspaceId}/my-reviews`)
      .then((response) => {
        setReviews(response.data);
        onCountChange?.(response.data.length);
        setIsLoading(false);
      })
      .catch(() => {
        onCountChange?.(0);
        setIsLoading(false);
      });
  }, [workspaceId, onCountChange]);

  if (isLoading) {
    return <div className="mpr-loading">Loading your reviews...</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="mpr-empty">
        <div className="mpr-empty-icon">⌁</div>
        <p>No reviews yet</p>
        <p className="mpr-empty-sub">
          Open a pull request on GitHub and your manager will review it here.
        </p>
      </div>
    );
  }

  return (
    <div className="mpr-list">
      {reviews.map((review) => {
        const verdictKey = getVerdictKey(review);
        const verdictLabel = getVerdictLabel(review);
        const issueCount = review.suggestions?.length || 0;

        return (
          <div key={review._id} className="mpr-card">
            <div className="mpr-card-top">
              <div className="mpr-pr-info">
                {review.prNumber && <span className="mpr-pr-num">PR #{review.prNumber}</span>}
                <div className="mpr-pr-copy">
                  <span className="mpr-pr-title">{review.prTitle || review.repoPath || 'Code Review'}</span>
                  <span className="mpr-pr-date">Reviewed {new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className={`mpr-verdict mpr-verdict--${verdictKey}`}>{verdictLabel}</div>
            </div>

            {review.summary && <div className="mpr-summary">{review.summary}</div>}

            <div className="mpr-card-meta">
              <span className="mpr-issues">{issueCount} issue{issueCount === 1 ? '' : 's'} found</span>
              {review.criticalCount > 0 && <span className="mpr-critical">{review.criticalCount} critical</span>}
            </div>

            {verdictKey === 'approved' && (
              <div className="mpr-approved-msg">Your code has been approved and is ready to merge.</div>
            )}

            {(review.managerDecisionAt || review.managerDecisionByName) && (
              <div className="mpr-decision-meta">
                Finalized
                {review.managerDecisionAt ? ` on ${new Date(review.managerDecisionAt).toLocaleDateString()}` : ''}
                {review.managerDecisionByName ? ` by ${review.managerDecisionByName}` : ''}
              </div>
            )}

            {review.reportVerdict && (
              <div className="mpr-report-info">
                <span className="mpr-report-label">Sprint report:</span>
                <span className={`mpr-report-verdict mpr-report-verdict--${review.reportVerdict}`}>
                  {review.reportVerdict === 'ready'
                    ? 'Sprint approved to ship'
                    : 'Sprint not ready to ship'}
                </span>
                {review.reportSprintName && (
                  <span className="mpr-report-sprint">({review.reportSprintName})</span>
                )}
              </div>
            )}

            {(verdictKey === 'rejected' || verdictKey === 'needs_revision') && (
              <>
                {review.managerFeedback && (
                  <div className="mpr-feedback">
                    <span className="mpr-feedback-label">Manager feedback</span>
                    <p className="mpr-feedback-text">{review.managerFeedback}</p>
                  </div>
                )}
                <div className="mpr-action-needed">Please fix the issues and open a new pull request.</div>
              </>
            )}

            {verdictKey === 'minor_issues' && (
              <div className="mpr-minor-msg">{issueCount} suggestions to review before merging.</div>
            )}

            {review.suggestions?.length > 0 && (
              <div className="mpr-suggestions-list">
                {review.suggestions.map((suggestion) => (
                  <div key={suggestion.id || suggestion.title} className={`mpr-suggestion mpr-suggestion--${suggestion.severity || 'info'}`}>
                    <div className="mpr-suggestion-top">
                      <span className="mpr-suggestion-severity">{suggestion.severity || 'info'}</span>
                      <span className="mpr-suggestion-title">{suggestion.title}</span>
                    </div>
                    {suggestion.description && <p className="mpr-suggestion-desc">{suggestion.description}</p>}
                    {suggestion.lineRef && <div className="mpr-suggestion-line">{suggestion.lineRef}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
