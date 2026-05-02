import './ChatBubble.css'

export default function ChatBubble({ role, content }) {
  return (
    <div className={`chat-bubble cb-${role}`}>
      <div className="cb-label">
        {role === 'ai' ? '🤖 CodeLens' : '👤 You'}
      </div>
      <div className="cb-content">{content}</div>
    </div>
  )
}

