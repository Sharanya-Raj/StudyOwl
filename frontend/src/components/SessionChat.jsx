import React, { useState } from 'react';
import PropTypes from 'prop-types';

function SessionChat({ sessionOrBuddy, chat, onSendMessage, onViewDetails }) {
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>{sessionOrBuddy?.title || sessionOrBuddy?.name || 'Chat'}</div>
        <button className="ghost-btn" onClick={onViewDetails}>View Details</button>
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
  onViewDetails: PropTypes.func.isRequired,
};

export default SessionChat;
