import PropTypes from 'prop-types';
import './ActionSelector.css';

/**
 * ActionSelector Component
 * Allows user to choose between browsing files or viewing PRs
 */
export default function ActionSelector({ repoName, onAction, onBack }) {
  return (
    <div className="actionSelector">
      <div className="actionCard">
        <button className="backButton" onClick={onBack}>
          ← Back to repositories
        </button>

        <div className="repoHeader">
          <h2>{repoName}</h2>
        </div>

        <div className="actionGrid">
          <div className="actionOption">
            <button
              className="actionButton browseFiles"
              onClick={() => onAction('files')}
            >
              <div className="actionIcon">📁</div>
              <h3>Browse Files</h3>
              <p>Navigate repository files and review individual files</p>
            </button>
          </div>

          <div className="actionOption">
            <button
              className="actionButton viewPRs"
              onClick={() => onAction('prs')}
            >
              <div className="actionIcon">🔀</div>
              <h3>View Pull Requests</h3>
              <p>Review changes in open pull requests</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

ActionSelector.propTypes = {
  repoName: PropTypes.string.isRequired,
  onAction: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};
