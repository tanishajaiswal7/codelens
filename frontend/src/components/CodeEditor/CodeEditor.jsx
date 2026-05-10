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
    // Ensure Monaco recalculates its layout so the scrollable viewport matches container
    try { editor.layout(); } catch (e) { /* ignore if layout not available */ }
  };

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
    }, 300);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, [initialCode]);

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
            if (!editor) return;
            
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
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(value) => {
            const nextCode = value || '';
            console.log('[Editor.onChange] Received', nextCode.split('\n').length, 'lines, length:', nextCode.length, 'chars');
            if (nextCode.split('\n').length > 1) {
              console.log('[Editor.onChange] First 100 chars:', nextCode.substring(0, 100));
            }
            setCode(nextCode);
            onCodeChange(nextCode);
          }}
          onMount={(editor) => {
            localEditorRef.current = editor;
            if (editorRef) {
              editorRef.current = editor;
            }
            
            // Force layout immediately and multiple times to ensure Monaco renders all lines
            const doLayout = () => { 
              try { 
                editor.layout(); 
                // Debug: log container and viewport info
                const container = editor.getContainerDomNode();
                const scrollHeight = editor.getScrollHeight();
                const contentHeight = editor.getContentHeight();
                const viewHeight = container?.clientHeight;
                const model = editor.getModel();
                const lineCount = model?.getLineCount();
                console.log(`[Monaco @mount] Container: ${viewHeight}px, ScrollHeight: ${scrollHeight}px, ContentHeight: ${contentHeight}px, Lines: ${lineCount}`);
              } catch (e) { 
                console.error('[Monaco @mount] Error:', e);
              } 
            };
            
            doLayout();
            setTimeout(doLayout, 25);
            setTimeout(doLayout, 75);
            setTimeout(() => {
              doLayout();
              resetEditorViewport();
            }, 150);
            setTimeout(doLayout, 250);
            
            // Re-layout on window resize
            const onResize = () => doLayout();
            window.addEventListener('resize', onResize);
            editor.__removeResize = () => window.removeEventListener('resize', onResize);
          }}
          theme="vs-dark"
          options={{
            readOnly: false,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'JetBrains Mono',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: false, 
            wordWrap: 'on',
            fixedOverflowWidgets: true,
            scrollbar: { 
              vertical: 'visible', 
              horizontal: 'hidden', 
              useShadows: true,
              verticalSliderSize: 14,
              verticalHasArrows: false,
            },
            /* Force rendering of lines beyond viewport to prevent virtualization gaps */
            renderWhitespace: 'none',
            glyphMargin: false,
            folding: true,
            /* Increase rendering buffer to cache more lines */
            codeActionsOnSave: {},
            /* Ensure viewport includes enough lines for smooth scrolling */
            lineDecorationsWidth: 10,
            scrollPredominantAxis: true,
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
