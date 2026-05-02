import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Editor from '@monaco-editor/react';
import ReReviewButton from '../ReReviewButton/ReReviewButton.jsx';
import './CodeEditor.css';

export default function CodeEditor({
  onSubmit,
  socraticMode,
  onSocraticToggle,
  onCodeChange,
  reviewExists,
  hasChanges,
  isReReviewing,
  onReReview,
  socraticCodeChanged,
  isLoading,
}) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');

  // Load preferred language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('codelens-preferred-language') || 'javascript';
    setLanguage(savedLanguage);
  }, []);

  const lineCount = code.split('\n').length;
  const canSubmit = code.trim().length > 0 && lineCount >= 5;

  const handleSubmit = async () => {
    await onSubmit(code, socraticMode)
  };

  return (
    <div className="editor-pane">
      <div className="pane-header">
        <div className="pane-title">
          <select
            className="lang-tag"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="csharp">C#</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="sql">SQL</option>
          </select>
          <span>{lineCount} lines</span>
        </div>

        <div className="socratic-toggle-wrap">
          <span>Socratic Mode</span>
          <div
            className={`toggle-track ${socraticMode ? 'on' : ''}`}
            onClick={() => onSocraticToggle(!socraticMode)}
          >
            <div className="toggle-knob" />
          </div>
        </div>
      </div>

      <div className="editor-surface">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(value) => {
            const nextCode = value || '';
            setCode(nextCode);
            onCodeChange(nextCode);
          }}
          theme="vs-dark"
          options={{
            readOnly: false,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'JetBrains Mono',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
          }}
        />
      </div>

      {socraticMode && socraticCodeChanged && (
        <div className="socratic-code-notice">
          Code changed — AI will notice on your next reply
        </div>
      )}

      <div className="editor-footer">
        {!socraticMode ? (
          <button
            className="review-btn"
            onClick={() => {
              const codeValue = code || ''
              onSubmit(codeValue, false)
            }}
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? 'Reviewing...' : '▶ Review Code'}
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

CodeEditor.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  socraticMode: PropTypes.bool.isRequired,
  onSocraticToggle: PropTypes.func.isRequired,
  onCodeChange: PropTypes.func,
  reviewExists: PropTypes.bool,
  hasChanges: PropTypes.bool,
  isReReviewing: PropTypes.bool,
  onReReview: PropTypes.func,
  socraticCodeChanged: PropTypes.bool,
};

CodeEditor.defaultProps = {
  onCodeChange: () => {},
  reviewExists: false,
  hasChanges: false,
  isReReviewing: false,
  onReReview: () => {},
  socraticCodeChanged: false,
};
