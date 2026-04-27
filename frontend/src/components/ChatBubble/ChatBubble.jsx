import PropTypes from 'prop-types';
import './ChatBubble.css';

export default function ChatBubble({ role, content, timestamp }) {
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`chat-bubble chat-bubble-${role}`}>
      <div>
        <div className={`chat-content chat-content-${role}`}>
          {content}
        </div>
        <div className="chat-timestamp">{formatTime(timestamp)}</div>
      </div>
    </div>
  );
}

ChatBubble.propTypes = {
  role: PropTypes.oneOf(['ai', 'user']).isRequired,
  content: PropTypes.string.isRequired,
  timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
};
