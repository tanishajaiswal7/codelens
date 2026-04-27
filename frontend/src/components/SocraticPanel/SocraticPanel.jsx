import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ChatBubble from '../ChatBubble/ChatBubble.jsx';
import { socraticApi } from '../../api/socraticApi.js';
import './SocraticPanel.css';

export default function SocraticPanel({
  // Uncontrolled mode (DashboardPage)
  code,
  persona,
  
  // Controlled mode (FileBrowser)
  messages: controlledMessages,
  turnCount: controlledTurnCount,
  maxTurns: controlledMaxTurns,
  isWaiting,
  completed,
  onReply,
  codeSnapshot,
  codeChanged,
  onReplySent,
  
  // Both modes
  onSwitchMode,
}) {
  // Determine if we're in controlled or uncontrolled mode
  const isControlled = controlledMessages !== undefined;

  // Uncontrolled mode state (for DashboardPage)
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [turnNumber, setTurnNumber] = useState(0);
  const [maxTurns] = useState(10);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, controlledMessages]);

  // Uncontrolled mode: Initialize session
  useEffect(() => {
    if (isControlled) return; // Skip if in controlled mode

    const startSession = async () => {
      try {
        setLoading(true);
        if (process.env.NODE_ENV === 'development') {
          console.log('Starting Socratic session with code length:', code.length, 'persona:', persona);
        }
        const response = await socraticApi.startSession(code, persona);
        if (process.env.NODE_ENV === 'development') {
          console.log('Socratic start response:', response);
        }
        const { session } = response;

        if (process.env.NODE_ENV === 'development') {
          console.log('Session data:', session);
        }
        setSessionId(session.sessionId);
        
        const questionText = session.question || 'No question received';
        
        setMessages([
          {
            role: 'ai',
            content: questionText,
            timestamp: new Date(),
          },
        ]);
        setTurnNumber(session.turnNumber || 1);
        setLoading(false);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to start session:', error.response?.data || error.message);
        }
        setLoading(false);
      }
    };

    startSession();
  }, [code, persona, isControlled]);

  // Uncontrolled mode: Handle send message
  const handleSendMessage = async () => {
    if (!input.trim() || !sessionId || isCompleted) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      },
    ]);

    try {
      setLoading(true);
      const response = await socraticApi.sendReply(sessionId, userMessage, codeSnapshot ?? code);
      const { session } = response;

      // Display single question
      const questionText = session.question || 'No question received';

      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: questionText,
          timestamp: new Date(),
        },
      ]);

      setTurnNumber(session.turnNumber);

      if (session.isCompleted) {
        setIsCompleted(true);
      }

      if (onReplySent) {
        onReplySent();
      }

      setLoading(false);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send message:', error);
      }
      setLoading(false);
    }
  };

  // Controlled mode: Handle send message
  const handleSendMessageControlled = async () => {
    if (!input.trim() || isWaiting || completed) return;

    const userMessage = input.trim();
    setInput('');
    
    // Call parent handler
    if (onReply) {
      await onReply(userMessage);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isControlled) {
        handleSendMessageControlled();
      } else {
        handleSendMessage();
      }
    }
  };

  // Use appropriate state based on mode
  const displayMessages = isControlled ? controlledMessages : messages;
  const displayTurnCount = isControlled ? controlledTurnCount : turnNumber;
  const displayMaxTurns = isControlled ? controlledMaxTurns : maxTurns;
  const displayLoading = isControlled ? isWaiting : loading;
  const displayCompleted = isControlled ? completed : isCompleted;

  if (!isControlled && loading && messages.length === 0) {
    return (
      <div className="socratic-panel">
        <div className="loading-indicator">
          Starting Socratic session
          <div className="loading-dot delay-0" />
          <div className="loading-dot delay-1" />
          <div className="loading-dot delay-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="socratic-panel">
      <div className="socratic-header">
        Socratic Mode
        <span className="turn-counter">
          Turn {displayTurnCount} / {displayMaxTurns}
        </span>
      </div>

      <div className="socratic-messages">
        {displayCompleted ? (
          <div className="completed-state">
            <div className="completed-title">✓ Insight reached!</div>
            <div className="completed-desc">
              You've completed the Socratic learning journey. Ready to verify your fixes? Switch to Review Mode and click Check My Fix.
            </div>
            <button className="switch-mode-btn" onClick={onSwitchMode}>
              Verify My Fixes
            </button>
          </div>
        ) : (
          <div>
            {displayMessages.map((msg, idx) => (
              <ChatBubble
                key={idx}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))}
            {displayLoading && (
              <div className="loading-indicator">
                Thinking
                <div className="loading-dot delay-0" />
                <div className="loading-dot delay-1" />
                <div className="loading-dot delay-2" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {!displayCompleted && (
        <div className="socratic-input-wrap">
          {codeChanged && (
            <div className="socratic-code-changed-banner">
              You edited the code — AI will ask about your change
            </div>
          )}
          <div className="socratic-input-row">
            <input
              className="socratic-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share your thoughts..."
              disabled={displayLoading}
            />
            <button
              className="socratic-send-btn"
              onClick={isControlled ? handleSendMessageControlled : handleSendMessage}
              disabled={!input.trim() || displayLoading}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

SocraticPanel.propTypes = {
  // Uncontrolled mode props
  code: PropTypes.string,
  persona: PropTypes.oneOf(['faang', 'startup', 'security']),
  
  // Controlled mode props
  messages: PropTypes.arrayOf(PropTypes.shape({
    role: PropTypes.oneOf(['ai', 'user']),
    content: PropTypes.string,
    timestamp: PropTypes.instanceOf(Date),
  })),
  turnCount: PropTypes.number,
  maxTurns: PropTypes.number,
  isWaiting: PropTypes.bool,
  completed: PropTypes.bool,
  onReply: PropTypes.func,
  codeSnapshot: PropTypes.string,
  codeChanged: PropTypes.bool,
  onReplySent: PropTypes.func,
  
  // Both modes
  onSwitchMode: PropTypes.func,
};

SocraticPanel.defaultProps = {
  code: '',
  persona: 'faang',
  messages: undefined,
  turnCount: 0,
  maxTurns: 10,
  isWaiting: false,
  completed: false,
  onReply: null,
  codeSnapshot: null,
  codeChanged: false,
  onReplySent: null,
  onSwitchMode: null,
};
