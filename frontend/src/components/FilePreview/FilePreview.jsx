import { useEffect, useState, useRef } from 'react';
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
  isExpanded = false,
  onToggleExpand = null,
}) {
  const [selectedPersona, setSelectedPersona] = useState('faang');
  const [editedCode, setEditedCode] = useState(null);
  const editorRef = useRef(null);
  const isDark = true;

  useEffect(() => {
    setEditedCode(null);
  }, [file?.path, file?.content]);

  // Cleanup resize listeners when unmounting
  useEffect(() => {
    return () => {
      try { editorRef.current && editorRef.current._resizeCleanup && editorRef.current._resizeCleanup(); } catch (e) {}
    };
  }, []);

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
        <button
          className="fp-expand-btn"
          onClick={() => onToggleExpand?.()}
          type="button"
        >
          {isExpanded ? 'Exit Full View' : 'Expand Editor'}
        </button>
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
      <div className="file-editor-container">
        <div className="fp-editor">
     <div
  style={{
    width: '100%',
    height: '100%',
    position: 'relative',
    minHeight: 0
  }}
>
            <Editor
              key={file.path || file.filename || file.content}
              height="100%"
              width="100%"
              language={file.language || 'plaintext'}
              value={editedCode !== null ? editedCode : file.content}
              theme={isDark ? 'vs-dark' : 'light'}
              onChange={(value) => {
                const next = value || '';
                setEditedCode(next);
                onCodeChange?.(next);
              }}
              options={{
                fontSize: isExpanded ? 11 : 12,
                lineHeight: 22,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                lineNumbers: 'on',
                lineNumbersMinChars: 3,
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 0,
                renderLineHighlight: 'line',
                scrollBeyondLastLine: false,
                wordWrap: 'off',
                automaticLayout: true,
                minimap: { enabled: false },
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  verticalScrollbarSize: 12,
                  horizontalScrollbarSize: 12,
                  useShadows: false,
                  alwaysConsumeMouseWheel: false
                },
                padding: { top: 12, bottom: 12 },
                readOnly: mode !== 'socratic',
                fixedOverflowWidgets: true,
              }}
              onMount={(editor) => {
                editorRef.current = editor;
                setTimeout(() => {
                  try { editor.layout(); } catch (e) {}
                  try { editor.revealLine(1); } catch (e) {}
                }, 100);
                const handleResize = () => { try { editor.layout(); } catch (e) {} };
                window.addEventListener('resize', handleResize);
                editor._resizeCleanup = () => window.removeEventListener('resize', handleResize);
              }}
            />
          </div>
        </div>
      </div>

      {mode === 'socratic' && editedCode !== null && editedCode !== file.content && (
        <div className="socratic-code-notice">
          Code changed — AI will notice on your next reply
        </div>
      )}
    </div>
  );
}
