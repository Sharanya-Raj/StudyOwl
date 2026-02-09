import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'

function ChatPanel({
  documentId,
  session,
  apiBaseUrl,
  title = 'Chat',
  emptyMessage = 'Ask me anything about your study materials.',
  placeholder = 'Ask a question...'
}) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    if (!documentId) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Upload a document to enable AI chat.' },
      ])
      setInput('')
      return
    }

    const userMessage = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const token = session?.access_token
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId,
          message: userMessage.content,
          conversationHistory: messages,
        }),
      })

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      const data = await response.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel-card chat-container">
      <div className="panel-header">
        <h3>{title}</h3>
        {!documentId ? <span className="panel-pill">Needs document</span> : null}
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty">{emptyMessage}</p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role}`}>
              <div
                className="chat-bubble"
                dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }}
              />
            </div>
          ))
        )}
        {loading && (
          <div className="chat-message assistant">
            <div className="chat-bubble loading">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          placeholder={placeholder}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleSendMessage()}
          disabled={loading}
        />
        <button
          className="primary-btn"
          type="button"
          onClick={handleSendMessage}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}

ChatPanel.propTypes = {
  documentId: PropTypes.string,
  session: PropTypes.shape({
    access_token: PropTypes.string,
  }),
  apiBaseUrl: PropTypes.string.isRequired,
  title: PropTypes.string,
  emptyMessage: PropTypes.string,
  placeholder: PropTypes.string,
}

export default ChatPanel
