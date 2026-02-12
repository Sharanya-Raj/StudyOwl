import React, { useState } from 'react';
import PropTypes from 'prop-types';

function SessionChat({ sessionOrBuddy, chat, onSendMessage }) {
  const [input, setInput] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  // Details for the card
  const details = sessionOrBuddy && (sessionOrBuddy.time || sessionOrBuddy.timing || sessionOrBuddy.date || sessionOrBuddy.details || sessionOrBuddy.location)
    ? {
        time: sessionOrBuddy.time || sessionOrBuddy.timing || '',
        date: sessionOrBuddy.date || '',
        details: sessionOrBuddy.details || sessionOrBuddy.location || '',
      }
    : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, position: 'relative' }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>{sessionOrBuddy?.title || sessionOrBuddy?.name || 'Chat'}</div>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            className="ghost-btn"
            type="button"
            onMouseEnter={() => setShowDetails(true)}
            onMouseLeave={() => setShowDetails(false)}
            tabIndex={0}
            style={{ position: 'relative', zIndex: 2 }}
          >
            View Details
          </button>
          {showDetails && details && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                background: '#fff',
                borderRadius: 14,
                boxShadow: '0 8px 24px rgba(107, 79, 57, 0.13)',
                padding: '18px 22px',
                minWidth: 220,
                border: '1px solid var(--panel-strong)',
                color: '#2f241d',
                fontSize: 15,
                zIndex: 10,
                whiteSpace: 'pre-line',
              }}
              onMouseEnter={() => setShowDetails(true)}
              onMouseLeave={() => setShowDetails(false)}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Session Details</div>
              {details.date && <div><b>Date:</b> {details.date}</div>}
              {details.time && <div><b>Time:</b> {details.time}</div>}
              {details.details && <div style={{ marginTop: 6 }}><b>Details:</b> {details.details}</div>}
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', background: '#f7f7f7', borderRadius: 6, padding: 12, marginBottom: 8, minHeight: 180 }}>
        {chat.length === 0 && <div style={{ color: '#aaa' }}>No messages yet.</div>}
        {chat.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>{msg.sender}:</span> <span>{msg.text}</span> <span style={{ color: '#888', fontSize: 12 }}>({msg.time})</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 8 }}
        />
        <button className="primary-btn" type="submit">Send</button>
      </form>
    </div>
  );
}

SessionChat.propTypes = {
  sessionOrBuddy: PropTypes.object,
  chat: PropTypes.array.isRequired,
  onSendMessage: PropTypes.func.isRequired,
};

export default SessionChat;
