import { useState, useEffect, useRef } from 'react';
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
  editorRef,
  initialCode,
  initialLanguage,
  hideSocraticToggle,
  hideLanguageSelector,
  minLinesToSubmit,
  activeIssuesCount = 999,
}) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const localEditorRef = useRef(null);
  const isDark = true;

  const resetEditorViewport = () => {
    const editor = localEditorRef.current;

    if (!editor) {
      return;
    }

    editor.setScrollTop(0);
    editor.setScrollLeft(0);
    editor.setPosition({ lineNumber: 1, column: 1 });
    editor.revealPositionInCenter({ lineNumber: 1, column: 1 });
    editor.revealLine(1);
    try { editor.layout(); } catch (e) { /* ignore if layout not available */ }
  };

  // Track if we're in the middle of loading code to prevent ResizeObserver feedback loops
  const isLoadingRef = useRef(false);

  // Load preferred language from localStorage on mount
  useEffect(() => {
    const savedLanguage = initialLanguage || localStorage.getItem('codelens-preferred-language') || 'javascript';
    setLanguage(savedLanguage);
  }, [initialLanguage]);

  useEffect(() => {
    setCode(initialCode || '');
    // Reset viewport and force multiple layouts after loading new code
    // so Monaco fully renders all lines and updates scrollbar
    console.log('[CodeChange] Loading', (initialCode || '').split('\n').length, 'lines');
    isLoadingRef.current = true; // Prevent ResizeObserver from firing during load
    
    const timer1 = setTimeout(() => {
      const editor = localEditorRef.current;
      try { 
        editor && editor.layout();
        if (editor) {
          const container = editor.getContainerDomNode();
          console.log('[CodeChange @50ms] Container:', container.clientHeight, 'Content height:', editor.getContentHeight(), 'Lines:', editor.getModel()?.getLineCount());
        }
      } catch (e) {}
    }, 50);
    const timer2 = setTimeout(() => {
      resetEditorViewport();
      const editor = localEditorRef.current;
      try { 
        editor && editor.layout(); 
        if (editor) {
          const container = editor.getContainerDomNode();
          console.log('[CodeChange @150ms] Container:', container.clientHeight, 'Content height:', editor.getContentHeight(), 'Lines:', editor.getModel()?.getLineCount());
        }
      } catch (e) {}
    }, 150);
    const timer3 = setTimeout(() => {
      const editor = localEditorRef.current;
      try { 
        editor && editor.layout(); 
        if (editor) {
          const container = editor.getContainerDomNode();
          console.log('[CodeChange @300ms] Container:', container.clientHeight, 'Content height:', editor.getContentHeight(), 'Lines:', editor.getModel()?.getLineCount());
        }
      } catch (e) {}
      isLoadingRef.current = false; // Allow ResizeObserver to fire again after load
    }, 300);
    return () => { 
      clearTimeout(timer1); 
      clearTimeout(timer2); 
      clearTimeout(timer3);
      isLoadingRef.current = false;
    };
  }, [initialCode]);

  // Ensure Monaco re-layouts after new code is loaded
  useEffect(() => {
    const ref = editorRef?.current || localEditorRef.current;
    if (code && ref) {
      setTimeout(() => {
        try {
          ref.layout();
          ref.setScrollPosition?.({ scrollTop: 0, scrollLeft: 0 });
          ref.revealLine?.(1);
        } catch (e) {}
      }, 50);
    }
  }, [code]);

  // Cleanup any editor resize handlers when unmounting
  useEffect(() => {
    return () => {
      try {
        if (localEditorRef.current && localEditorRef.current._resizeCleanup) {
          localEditorRef.current._resizeCleanup();
        }
        if (editorRef && editorRef.current && editorRef.current._resizeCleanup) {
          editorRef.current._resizeCleanup();
        }
      } catch (e) {}
    };
  }, []);

  const lineCount = code.split('\n').length;
  const canSubmit = code.trim().length > 0 && lineCount >= minLinesToSubmit;

  const handleSubmit = async () => {
    await onSubmit(code, socraticMode)
  };

  return (
    <div className="editor-pane">
      <div className="pane-header">
        <div className="pane-title">
          {hideLanguageSelector ? (
            <span className="lang-tag lang-tag--static">{language.toUpperCase()}</span>
          ) : (
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
          )}
          <span>{lineCount} lines</span>
        </div>

        {!hideSocraticToggle && (
          <div className="socratic-toggle-wrap">
            <span>Socratic Mode</span>
            <div
              className={`toggle-track ${socraticMode ? 'on' : ''}`}
              onClick={() => onSocraticToggle(!socraticMode)}
            >
              <div className="toggle-knob" />
            </div>
          </div>
        )}
      </div>

      <div className="editor-surface" ref={(el) => {
        // Watch container for size changes and force Monaco layout
        if (el && !el.__resizeObserver) {
          let resizeTimeout = null;
          const resizeObserver = new ResizeObserver(() => {
            const editor = localEditorRef.current;
            if (!editor || isLoadingRef.current) return; // Don't trigger during code load
            
            // Debounce resize handling to prevent feedback loops
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
              try { 
                console.log('[ResizeObserver] Triggering layout due to container resize');
                editor.layout(); 
              } catch (e) {}
            }, 50);
          });
          resizeObserver.observe(el);
          el.__resizeObserver = resizeObserver;
        }
      }}>
<div
  style={{
    width: '100%',
    flex: 1,
    minHeight: 0,
    position: 'relative',
    display: 'flex'
  }}
>
          <Editor
            height="100%"
            width="100%"
            language={language || 'javascript'}
            value={code}
            theme={isDark ? 'vs-dark' : 'light'}
            onChange={(value) => {
              const next = value || '';
              setCode(next);
              onCodeChange && onCodeChange(next);
            }}
            options={{
              fontSize: 13,
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
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
                useShadows: false,
                alwaysConsumeMouseWheel: false
              },
              padding: { top: 12, bottom: 12 },
              contextmenu: true,
              selectOnLineNumbers: true,
              roundedSelection: false,
              readOnly: false,
              cursorStyle: 'line',
              mouseWheelZoom: false,
              fixedOverflowWidgets: true,
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false
            }}
            onMount={(editor, monaco) => {
              // Force layout recalculation after mount
              setTimeout(() => {
                try { editor.layout(); } catch (e) {}
                try { editor.revealLine(1); } catch (e) {}
              }, 100);
              // Also recalculate on window resize
              const handleResize = () => editor.layout();
              window.addEventListener('resize', handleResize);
              // Store cleanup function
              editor._resizeCleanup = () => {
                window.removeEventListener('resize', handleResize);
              };
              // Store ref
              localEditorRef.current = editor;
              if (editorRef) editorRef.current = editor;
            }}
          />
        </div>
      </div>

      {socraticMode && socraticCodeChanged && (
        <div className="socratic-code-notice">
          Code changed — AI will notice on your next reply
        </div>
      )}

      <div className="editor-footer">
        {!socraticMode ? (
          <>
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

            {/* Re-review button appears when all issues are fixed and code has been edited */}
            <ReReviewButton
              onClick={() => onReReview(code)}
              isLoading={isReReviewing}
              hasChanges={reviewExists && hasChanges}
              activeIssuesCount={activeIssuesCount}
            />
          </>
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
  editorRef: PropTypes.shape({ current: PropTypes.any }),
  initialCode: PropTypes.string,
  initialLanguage: PropTypes.string,
  hideSocraticToggle: PropTypes.bool,
  hideLanguageSelector: PropTypes.bool,
  minLinesToSubmit: PropTypes.number,
  activeIssuesCount: PropTypes.number,
};

CodeEditor.defaultProps = {
  onCodeChange: () => {},
  reviewExists: false,
  hasChanges: false,
  isReReviewing: false,
  onReReview: () => {},
  socraticCodeChanged: false,
  editorRef: null,
  initialCode: '',
  initialLanguage: null,
  hideSocraticToggle: false,
  hideLanguageSelector: false,
  minLinesToSubmit: 5,
  activeIssuesCount: 999,
};
