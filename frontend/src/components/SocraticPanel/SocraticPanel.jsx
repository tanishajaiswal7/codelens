import { useState, useEffect, useRef } from 'react'
import './SocraticPanel.css'

export default function SocraticPanel({
  messages = [],
  turnCount = 0,
  maxTurns = 10,
  totalBugs = 0,
  discoveredCount = 0,
  isWaiting = false,
  completed = false,
  retryRequired = false,
  optimizedCode = null,
  originalCode = null,
  error = null,
  onReply,
  onStartSession,
  onRetry,
  onExtend,
  onSwitchToReview,
  language = 'javascript',
}) {
  const [input, setInput] = useState('')
  const [showOptimized, setShowOptimized] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [hasExtended, setHasExtended] = useState(false)
  const [copied, setCopied] = useState(false)
  const [bugSolvedThisTurn, setBugSolvedThisTurn] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isWaiting])

  useEffect(() => {
    if (messages.length > 0 || completed) {
      setSessionStarted(true)
    }
  }, [messages, completed])

  useEffect(() => {
    if (bugSolvedThisTurn) {
      const timer = setTimeout(() => {
        setBugSolvedThisTurn(false)
      }, 700)
      return () => clearTimeout(timer)
    }
  }, [bugSolvedThisTurn])

  // Track previous discoveredCount to detect when a new bug is solved
  const prevDiscoveredCountRef = useRef(0)
  useEffect(() => {
    if (discoveredCount > prevDiscoveredCountRef.current) {
      setBugSolvedThisTurn(true)
    }
    prevDiscoveredCountRef.current = discoveredCount
  }, [discoveredCount])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isWaiting || completed) return
    onReply(trimmed)
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const sessionProgress = maxTurns > 0 ? (turnCount / maxTurns) * 100 : 0
  const bugsProgress = totalBugs > 0 ? (discoveredCount / totalBugs) * 100 : 0
  const isFirstMessage = messages.length === 0 && !isWaiting
  const showInput = !completed && !retryRequired && messages.length > 0

  return (
    <div className="sp-container">

      {/* ── Header with turn badge and progress bars ── */}
      <div className="sp-header">
        <div className="sp-title-group">
          <h3 className="sp-title">Socratic Session</h3>
          <span className="sp-subtitle">Learn by discovering bugs</span>
        </div>
        <div className="sp-turn-badge">
          {completed ? (
            <span className="sc-turns-used">{Math.min(turnCount, maxTurns)} turns used</span>
          ) : (
            <span>Turn {Math.min(turnCount, maxTurns)}/{maxTurns}</span>
          )}
        </div>
      </div>

      {/* ── Error message ── */}
      {error && (
        <div className="sp-error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* ── Progress bars ── */}
      <div className="sp-progress-group">
        <div className="sp-progress-item">
          <label className="sp-progress-label">Session Progress</label>
          <div className="sp-progress-bar">
            <div 
              className="sp-progress-fill" 
              style={{ width: `${sessionProgress}%` }}
            />
          </div>
        </div>
        <div className="sp-progress-item">
          <label className={`sp-progress-label ${bugSolvedThisTurn ? 'bug-solved-flash' : ''}`}>
            Bugs Found <span className={`bugs-found-counter ${bugSolvedThisTurn ? 'just-incremented' : ''}`}>({discoveredCount}/{totalBugs})</span>
          </label>
          <div className="sp-progress-bar">
            <div 
              className="sp-progress-fill sp-bugs-fill"
              style={{ width: `${bugsProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {isFirstMessage && !sessionStarted && (
        <div className="sp-empty">
          <div className="sp-empty-icon">🔍</div>
          <div className="sp-empty-title">Socratic Mode is ready</div>
          <div className="sp-empty-text">
            Click Start Session and I’ll analyze your code, ask the first question,
            and guide you step by step.
          </div>
          <button
            className="sp-start-btn"
            onClick={() => {
              setSessionStarted(true)
              onStartSession?.()
            }}
            disabled={isWaiting}
          >
            {isWaiting ? 'Starting...' : 'Start Session'}
          </button>
        </div>
      )}

      {/* ── Loading state ── */}
      {sessionStarted && isWaiting && messages.length === 0 && (
        <div className="sp-loading">
          <div className="sp-loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="sp-loading-text">Analysing your code...</div>
        </div>
      )}

      {/* ── Messages ── */}
      {sessionStarted && (
        <div className="sp-messages">
          {messages.map((msg, i) => {
            const isNewBugStart = i > 0 && msg.role === 'ai' && messages[i - 1]?.role === 'ai'

            return (
              <div key={i}>
                {isNewBugStart && (
                  <div className="sp-bug-separator">
                    <div className="sp-bug-sep-line" />
                    <span className="sp-bug-sep-label">Next issue</span>
                    <div className="sp-bug-sep-line" />
                  </div>
                )}
                <div className={`sp-bubble sp-bubble-${msg.role}`}>
                  <div className={`sp-bubble-label ${msg.role === 'user' ? 'sp-user-label' : ''}`}>
                    {msg.role === 'ai' ? 'CodeLens AI' : 'You'}
                  </div>
                  <div className="sp-bubble-content">
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })}

          {/* ── Thinking indicator ── */}
          {isWaiting && messages.length > 0 && (
            <div className="sp-thinking">
              <div className="sp-thinking-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {/* ── Retry card ── */}
          {retryRequired && !completed && (
            <div className="sp-complete-card sp-retry-card">
              <div className="sp-complete-emoji">↻</div>
              <div className="sp-complete-title">Try Again</div>
              <div className="sp-complete-body">
                You found {discoveredCount}/{totalBugs} bugs before the turn budget ran out.
                Restart the session to begin again from turn 0.
              </div>

              <button
                className="sp-review-btn"
                onClick={onRetry || onStartSession}
                disabled={isWaiting}
              >
                Restart Session
              </button>
            </div>
          )}

          {/* ── Completion card ── */}
          {completed && !retryRequired && (() => {
            const bugsFound = discoveredCount || 0
            const totalBugsCount = totalBugs || 0
            const allFound = bugsFound >= totalBugsCount
            const noneFound = bugsFound === 0

            const completionMessage = allFound
              ? {
                  title: 'Outstanding work!',
                  body: `You discovered all ${totalBugsCount} issue${totalBugsCount !== 1 ? 's' : ''} in this code through your own reasoning. That is exactly how great engineers think!`,
                  emoji: '🎉'
                }
              : bugsFound > 0
              ? {
                  title: 'Good effort!',
                  body: `You found ${bugsFound} out of ${totalBugsCount} issue${totalBugsCount !== 1 ? 's' : ''}. The Socratic session has ended but you made real progress. Switch to Review Mode to see the full analysis.`,
                  emoji: '📋'
                }
              : {
                  title: 'Session ended.',
                  body: `You used all your turns. No issues were identified yet. Switch to Review Mode to see the full AI analysis of this code.`,
                  emoji: '⏰'
                }

            return (
              <div className="sp-complete-card">
                <div className="sp-complete-emoji">{completionMessage.emoji}</div>
                <div className="sp-complete-title">{completionMessage.title}</div>
                <div className="sp-complete-body">{completionMessage.body}</div>

                <div className="sc-bugs-summary">
                  <span className="sc-bugs-found">{bugsFound}</span>
                  <span className="sc-bugs-sep"> / </span>
                  <span className="sc-bugs-total">{totalBugsCount}</span>
                  <span className="sc-bugs-label"> issues discovered</span>
                </div>

                {optimizedCode && (
                  <div className="sp-optimized-section">
                    <button
                      className="sp-toggle-code-btn"
                      onClick={() => setShowOptimized(!showOptimized)}
                    >
                      {showOptimized ? '✕ Hide' : '▶ Show'} Optimized Code
                    </button>
                    {showOptimized && (
                      <>
                        <div className="sp-optimized-header">
                          <span>Fixed and optimized version</span>
                          <button
                            className="sp-copy-btn"
                            onClick={() => {
                              navigator.clipboard.writeText(optimizedCode)
                              setCopied(true)
                              setTimeout(() => setCopied(false), 2000)
                            }}
                          >
                            {copied ? 'Copied!' : 'Copy code'}
                          </button>
                        </div>
                        <pre className="sp-code-block">
                          <code>{optimizedCode}</code>
                        </pre>
                      </>
                    )}
                  </div>
                )}

                {!allFound && (
                  <div className="sc-options">
                    <button
                      className="sc-reset-btn"
                      onClick={() => onRetry?.()}
                      disabled={isWaiting}
                    >
                      Try again — reset session
                    </button>
                    <button
                      className="sc-extend-btn"
                      onClick={() => {
                        onExtend?.()
                        setHasExtended(true)
                      }}
                      disabled={hasExtended || isWaiting}
                    >
                      {hasExtended ? 'Already extended' : 'Get 5 more turns'}
                    </button>
                  </div>
                )}

                <button
                  className="sp-review-btn"
                  onClick={onSwitchToReview}
                >
                  See Full Review →
                </button>
              </div>
            )
          })()
          }

          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Input area ── */}
      {sessionStarted && showInput && (
        <div className="sp-input-area">
          <div className="sp-input-hint">
            {isWaiting ? 'Waiting for response...' : 'Answer or ask a doubt'}
          </div>
          <div className="sp-input-row">
            <textarea
              ref={inputRef}
              className="sp-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              disabled={isWaiting || completed}
              rows={2}
            />
            <button
              className="sp-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isWaiting || completed}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
