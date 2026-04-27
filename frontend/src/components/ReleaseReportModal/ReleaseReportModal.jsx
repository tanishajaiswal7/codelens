import React from 'react';
import './ReleaseReportModal.css';

const ReleaseReportModal = ({ report, onClose }) => {
  const getVerdictBadge = () => {
    const classes = {
      ready: 'verdict-ready',
      not_ready: 'verdict-not-ready',
      needs_review: 'verdict-needs-review',
    };
    const labels = {
      ready: 'READY TO SHIP',
      not_ready: 'NOT READY',
      needs_review: 'NEEDS REVIEW',
    };
    return (
      <div className={`verdict-badge-large ${classes[report.verdict] || ''}`}>
        {labels[report.verdict] || report.verdict}
      </div>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="release-report-title" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {getVerdictBadge()}
        </div>

        <div className="modal-body">
          <section className="summary-section">
            <h3 id="release-report-title">{report.sprintName} Overview</h3>
            <p>{report.executiveSummary}</p>
          </section>

          {report.blockers && report.blockers.length > 0 && (
            <section className="blockers-section">
              <h3>Blockers</h3>
              {report.blockers.map((blocker, index) => (
                <div key={blocker.prNumber || index} className="issue-item">
                  <strong>{blocker.title}</strong>
                  <div className="issue-details">
                    {blocker.file ? `File: ${blocker.file}` : 'File: unknown'}
                    {blocker.prNumber ? ` | PR: ${blocker.prNumber}` : ' | PR: n/a'}
                    {blocker.severity ? ` | Severity: ${blocker.severity}` : ''}
                  </div>
                  <div className="issue-recommendation">{blocker.recommendation}</div>
                </div>
              ))}
            </section>
          )}

          {report.risks && report.risks.length > 0 && (
            <section className="risks-section">
              <h3>Risks</h3>
              {report.risks.map((risk, index) => (
                <div key={risk.prNumber || index} className="issue-item">
                  <strong>{risk.title}</strong>
                  <div className="issue-details">
                    {risk.file ? `File: ${risk.file}` : 'File: unknown'}
                    {risk.prNumber ? ` | PR: ${risk.prNumber}` : ' | PR: n/a'}
                    {risk.severity ? ` | Severity: ${risk.severity}` : ''}
                  </div>
                  <div className="issue-recommendation">{risk.recommendation}</div>
                </div>
              ))}
            </section>
          )}

          <section className="recommendations-section">
            <h3>Recommendations</h3>
            <p>{report.recommendations || 'No recommendations available at this time.'}</p>
          </section>

          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-label">Approved PRs:</span>
              <span className="stat-value">{report.approvedPRCount ?? 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Flagged PRs:</span>
              <span className="stat-value">{report.flaggedPRCount ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={handlePrint} className="btn-primary">Print Report</button>
        </div>
      </div>
    </div>
  );
};

export default ReleaseReportModal;