import { useState } from 'react';
import Editor from '@monaco-editor/react';
import PersonaPicker from '../PersonaPicker/PersonaPicker.jsx';
import { socraticApi } from '../../api/socraticApi.js';
import './FilePreview.css';

export default function FilePreview({
  file,
  isLoading,
  isReviewing,
  onReview,
  mode = 'review',
  onModeChange = null,
  onStartSocratic = null,
  isSocraticLoading = false,
  onCodeChange = null,
}) {
  const [selectedPersona, setSelectedPersona] = useState('faang');
  const [editedCode, setEditedCode] = useState(null);

  if (isLoading) {
    return (
      <div className="file-preview-loading">
        <div className="fp-loading-spinner"></div>
        <span>Loading file...</span>
      </div>
    );
  }

  if (!file) {
    return null;
  }

  return (
    <div className="file-preview">
      {/* File header */}
      <div className="fp-header">
        <span className="fp-filename">{file.filename || file.path?.split('/').pop()}</span>
        <span className="fp-lang-badge">{file.language?.toUpperCase()}</span>
        <span className="fp-line-count">{file.lineCount} lines</span>
        {file.truncated && (
          <span className="fp-truncation-warning">
            ⚠ Showing first 300 lines
          </span>
        )}
      </div>

      {/* Action bar */}
      <div className="fp-actions">
        {/* Mode toggle */}
        <div className="fp-mode-toggle">
          <button
            className={`fp-mode-btn ${mode === 'review' ? 'active' : ''}`}
            onClick={() => onModeChange?.('review')}
          >
            Review
          </button>
          <button
            className={`fp-mode-btn ${mode === 'socratic' ? 'active' : ''}`}
            onClick={() => onModeChange?.('socratic')}
          >
            Socratic
          </button>
        </div>

        {/* Actions based on mode */}
        <div className="fp-actions-right">
          <PersonaPicker
            selectedPersona={selectedPersona}
            onPersonaChange={setSelectedPersona}
            compact={true}
          />
          {mode === 'review' ? (
            <button
              className="fp-review-btn"
              onClick={() => onReview(selectedPersona)}
              disabled={isReviewing || !selectedPersona}
            >
              {isReviewing ? (
                <>
                  <span className="fp-spinner"></span>
                  Generating...
                </>
              ) : (
                '▶  Review file'
              )}
            </button>
          ) : (
            <button
              className="fp-review-btn socratic"
              onClick={() => onStartSocratic?.(selectedPersona)}
              disabled={isSocraticLoading || !selectedPersona}
            >
              {isSocraticLoading ? (
                <>
                  <span className="fp-spinner"></span>
                  Starting...
                </>
              ) : (
                '▶  Start Socratic'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Monaco Editor — takes remaining height */}
      <div className="fp-editor">
        <Editor
          key={file.path || file.filename || file.content}
          value={editedCode !== null ? editedCode : file.content}
          language={file.language || 'plaintext'}
          theme="vs-dark"
          height="100%"
          onChange={(value) => {
            const nextCode = value || '';
            setEditedCode(nextCode);
            onCodeChange?.(nextCode);
          }}
          onMount={(editor) => {
            editor.setPosition({ lineNumber: 1, column: 1 });
            editor.revealLine(1);
          }}
          options={{
            readOnly: mode !== 'socratic',
            minimap: { enabled: false },
            fontSize: 12,
            lineHeight: 21,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      </div>

      {mode === 'socratic' && editedCode !== null && editedCode !== file.content && (
        <div className="socratic-code-notice">
          Code changed — AI will notice on your next reply
        </div>
      )}
    </div>
  );
}
