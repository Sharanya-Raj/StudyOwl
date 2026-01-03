import PropTypes from 'prop-types'
import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function StudySession({ doc, user }) {
  const [mode, setMode] = useState('chat')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const isPdf = doc.type === 'application/pdf'
  const isImage = doc.type.startsWith('image/')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    if (!doc.documentId) {
      alert('Document is still processing. Please wait.')
      return
    }

    const userMessage = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:8888/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.documentId,
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
    <main className="home-page">
      <header className="home-header">
        <div>
          <p className="eyebrow">Study Session</p>
          <h1 className="home-title">{doc.name}</h1>
          <p className="home-subtitle">
            {doc.documentId
              ? 'Preview your document and choose how you want to study.'
              : 'Processing document... This may take a moment.'}
          </p>
        </div>
        <div className="home-actions">
          <Link className="ghost-btn" to="/home">
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="study-layout">
        <div className="doc-preview">
          {isPdf ? (
            <>
              {doc.url && console.log('PDF URL:', doc.url)}
              <embed src={doc.url} type="application/pdf" className="doc-frame" />
            </>
          ) : isImage ? (
            <img src={doc.url} alt={doc.name} className="doc-image" />
          ) : (
            <iframe title="Document preview" src={doc.url} className="doc-frame" />
          )}
        </div>

        <div className="study-panel">
          <div className="mode-buttons">
            <button
              className={mode === 'chat' ? 'primary-btn' : 'ghost-btn'}
              type="button"
              onClick={() => setMode('chat')}
            >
              Ask the chatbot
            </button>
            <button
              className={mode === 'techniques' ? 'primary-btn' : 'ghost-btn'}
              type="button"
              onClick={() => setMode('techniques')}
            >
              Study techniques
            </button>
          </div>

          {mode === 'chat' ? (
            <div className="panel-card chat-container">
              <h3>Chat about this document</h3>
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <p className="chat-empty">Ask me anything about the document!</p>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                      <div className="chat-bubble">{msg.content}</div>
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
                  placeholder="Ask a question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
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
          ) : (
            <div className="panel-card">
              <h3>Study techniques</h3>
              <ul className="panel-list">
                <li>Generate flashcards from key concepts.</li>
                <li>Take quick quizzes to reinforce memory.</li>
                <li>Create spaced-repetition review sets.</li>
              </ul>
              <p className="panel-hint">Coming soon: pick a technique and start a guided session.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

StudySession.propTypes = {
  doc: PropTypes.shape({
    name: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    documentId: PropTypes.string,
  }).isRequired,
  user: PropTypes.shape({
    email: PropTypes.string,
  }),
}

export default StudySession
