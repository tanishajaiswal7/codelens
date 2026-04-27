import PropTypes from 'prop-types';
import './PersonaPicker.css';

const personas = [
  {
    id: 'faang',
    label: 'FAANG SWE',
    description: 'Scalability & design patterns',
  },
  {
    id: 'startup',
    label: 'Startup Founder',
    description: 'Pragmatic & ship speed',
  },
  {
    id: 'security',
    label: 'Security Auditor',
    description: 'Vulnerabilities & OWASP',
  },
];

export default function PersonaPicker({ selectedPersona, onPersonaChange, compact = false }) {
  if (compact) {
    return (
      <select
        className="persona-picker-compact"
        value={selectedPersona}
        onChange={(e) => onPersonaChange(e.target.value)}
      >
        {personas.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="persona-bar">
      <div className="persona-bar-label">Select Persona</div>
      <div className="persona-row">
        {personas.map((persona) => (
          <div
            key={persona.id}
            className={`persona-card ${
              selectedPersona === persona.id
                ? `active-${persona.id}`
                : ''
            }`}
            onClick={() => onPersonaChange(persona.id)}
          >
            <div className={`persona-icon icon-bg-${persona.id}`}>
              {persona.id === 'faang' && '🏢'}
              {persona.id === 'startup' && '🚀'}
              {persona.id === 'security' && '🔒'}
            </div>
            <div className="persona-info">
              <div className="persona-name">{persona.label}</div>
              <div className="persona-desc">{persona.description}</div>
            </div>
            {selectedPersona === persona.id && (
              <div className={`persona-active-dot active-${persona.id}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

PersonaPicker.propTypes = {
  selectedPersona: PropTypes.oneOf(['faang', 'startup', 'security']).isRequired,
  onPersonaChange: PropTypes.func.isRequired,
  compact: PropTypes.bool,
};
