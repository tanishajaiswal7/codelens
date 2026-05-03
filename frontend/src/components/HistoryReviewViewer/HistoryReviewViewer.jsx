import { useState, useRef } from 'react'
import Editor from '@monaco-editor/react'
import ReviewPanel from '../ReviewPanel/ReviewPanel'
import './HistoryReviewViewer.css'

export default function HistoryReviewViewer({
  review,      // full review object from API
  onClose,     // callback to go back to new review
  onReReview,  // callback to load code into editor for fresh review
}) {
  const editorRef = useRef(null)
  const [highlightedLine, setHighlightedLine] = useState(null)
  const [decorations, setDecorations] = useState([])

  // When a suggestion is clicked, highlight its line in editor
  const handleSuggestionClick = (lineRef) => {
    if (!lineRef || !editorRef.current) return
    const match = lineRef.match(/\d+/)
    if (!match) return
    const lineNum = parseInt(match[0])
    setHighlightedLine(lineNum)

    const editor = editorRef.current
    // Scroll to and highlight the line
    editor.revealLineInCenter(lineNum)
    const newDecorations = editor.deltaDecorations(
      decorations,
      [{
        range: {
          startLineNumber: lineNum,
          endLineNumber: lineNum,
          startColumn: 1,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'history-highlighted-line',
          glyphMarginClassName: 'history-glyph-dot',
        },
      }]
    )
    setDecorations(newDecorations)
  }

  const persona = review.persona?.toUpperCase() || 'FAANG'
  const timeAgo = formatTimeAgo(review.createdAt)
  const language = detectLanguage(review.code || '')

  return (
    <div className="hrv">

      {/* ── Top header bar ── */}
      <div className="hrv-header">
        <div className="hrv-header-left">
          <button className="hrv-back-btn" onClick={onClose}>
            ← New Review
          </button>
          <div className="hrv-breadcrumb">
            <span className="hrv-crumb">History</span>
            <span className="hrv-crumb-sep">›</span>
            <span className="hrv-crumb hrv-crumb-active">
              {persona} Review
            </span>
          </div>
        </div>

        <div className="hrv-header-meta">
          <span className={`hrv-persona-tag hrv-tag-${review.persona}`}>
            {persona}
          </span>
          <span className="hrv-time">{timeAgo}</span>
          <span className="hrv-issues-count">
            {review.suggestions?.length || 0} issues
          </span>
        </div>

        <button
          className="hrv-rereview-btn"
          onClick={() => onReReview(review.code, review.persona)}
          title="Load this code and run a fresh review"
        >
          ↻ Fresh Review
        </button>
      </div>

      {/* ── Split workspace ── */}
      <div className="hrv-workspace">

        {/* LEFT: Code viewer */}
        <div className="hrv-code-pane">
          <div className="hrv-pane-header">
            <div className="hrv-pane-title">
              <span>Original code</span>
              <span className="hrv-lang-tag">{language}</span>
            </div>
            <div className="hrv-pane-meta">
              {review.code?.split('\n').length || 0} lines
              · read only
            </div>
          </div>

          <div className="hrv-editor-wrap">
            {review.code ? (
              <Editor
                value={review.code}
                language={language}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineHeight: 20,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  renderLineHighlight: 'all',
                  lineNumbers: 'on',
                  folding: false,
                  contextmenu: false,
                  scrollbar: {
                    verticalScrollbarSize: 4,
                    horizontalScrollbarSize: 4,
                  },
                }}
                onMount={(editor) => {
                  editorRef.current = editor
                }}
              />
            ) : (
              <div className="hrv-no-code">
                <div className="hrv-no-code-icon">📄</div>
                <div className="hrv-no-code-text">
                  Code not available for this review.
                  Older reviews may not have saved the code.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Review panel */}
        <div className="hrv-review-pane">
          <ReviewPanel
            review={review}
            isLoading={false}
            isHistoryView={true}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>

      </div>
    </div>
  )
}

// Detect language from code content
function detectLanguage(code) {
  if (!code) return 'plaintext'
  if (code.includes('def ') && code.includes(':')) return 'python'
  if ((code.includes('const ') || code.includes('function ') ||
      code.includes('=>')) && code.includes('var ')) return 'javascript'
  if (code.includes('interface ') || code.includes(': string') ||
      code.includes(': number')) return 'typescript'
  if (code.includes('public class') || code.includes('void '))
    return 'java'
  if (code.includes('func ') && code.includes('package')) return 'go'
  return 'plaintext'
}

// Simple time ago helper (no dependency on date-fns)
function formatTimeAgo(dateString) {
  if (!dateString) return 'some time ago'
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString()
}
