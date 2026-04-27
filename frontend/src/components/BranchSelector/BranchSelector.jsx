import PropTypes from 'prop-types';
import './BranchSelector.css';

/**
 * BranchSelector Component
 * Dropdown to select which branch to browse
 */
export default function BranchSelector({ branches, currentRef, onRefChange }) {
  if (!branches || branches.length === 0) {
    return null;
  }

  return (
    <select
      className="branch-selector"
      value={currentRef}
      onChange={(e) => onRefChange(e.target.value)}
    >
      {branches.map((branch) => (
        <option key={branch.name} value={branch.name}>
          {branch.name}
          {branch.isDefault ? ' (default)' : ''}
        </option>
      ))}
    </select>
  );
}

BranchSelector.propTypes = {
  branches: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      isDefault: PropTypes.bool.isRequired,
    })
  ).isRequired,
  currentRef: PropTypes.string.isRequired,
  onRefChange: PropTypes.func.isRequired,
};
