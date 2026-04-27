import { useState, useEffect } from 'react'
import axiosInstance from '../../utils/axiosInstance'
import './MemberPRReviews.css'

export default function MemberPRReviews({ workspaceId }) {
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch reviews that belong to current user in this workspace
    axiosInstance.get(`/api/workspace/${workspaceId}/my-reviews`)
      .then(r => {
        setReviews(r.data)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [workspaceId])

  if (isLoading) return (
    <div className="mpr-loading">Loading your reviews...</div>
  )

  if (reviews.length === 0) return (
    <div className="mpr-empty">
      <div className="mpr-empty-icon">📋</div>
      <p>No reviews yet</p>
      <p className="mpr-empty-sub">
        Open a pull request on GitHub and your manager 
        will review it here
      </p>
    </div>
  )

  return (
    <div className="mpr-list">
      {reviews.map(review => (
        <div key={review._id} className="mpr-card">
          <div className="mpr-card-top">
            <div className="mpr-pr-info">
              {review.prNumber && (
                <span className="mpr-pr-num">PR #{review.prNumber}</span>
              )}
              <span className="mpr-pr-title">{review.repoPath || 'Code Review'}</span>
            </div>
            <div className={`mpr-verdict mpr-verdict--${review.managerDecision || review.verdict}`}>
              {review.managerDecision === 'approved' ? '✅ Approved' :
               review.managerDecision === 'rejected' ? '❌ Changes Requested' :
               review.verdict === 'approved' ? '✅ Approved' :
               review.verdict === 'needs_revision' ? '⚠️ Needs Revision' :
               '🔍 Under Review'}
            </div>
          </div>

          <div className="mpr-card-meta">
            <span className="mpr-date">
              Reviewed {new Date(review.createdAt).toLocaleDateString()}
            </span>
            <span className="mpr-issues">
              {review.suggestions?.length || 0} issues found
            </span>
            {review.criticalCount > 0 && (
              <span className="mpr-critical">
                {review.criticalCount} critical
              </span>
            )}
          </div>

          {review.managerFeedback && (
            <div className="mpr-feedback">
              <span className="mpr-feedback-label">Manager feedback:</span>
              <p className="mpr-feedback-text">{review.managerFeedback}</p>
            </div>
          )}

          {review.managerDecision === 'rejected' && (
            <div className="mpr-action-needed">
              ⚠️ Please fix the issues and open a new pull request
            </div>
          )}

          {review.managerDecision === 'approved' && (
            <div className="mpr-approved-msg">
              🎉 Your code has been approved and is ready to merge
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
