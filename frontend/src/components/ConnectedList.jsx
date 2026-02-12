import React from 'react';
import PropTypes from 'prop-types';

function ConnectedList({ connectedSessions, connectedBuddies, onSelectSession, onSelectBuddy, selectedId }) {
  return (
    <div style={{ minWidth: 220, borderRight: '1px solid #eee', paddingRight: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>My Sessions</div>
      <ul style={{ listStyle: 'none', padding: 0, marginBottom: 16 }}>
        {connectedSessions.length === 0 && <li style={{ color: '#aaa' }}>No sessions</li>}
        {connectedSessions.map(session => (
          <li key={session.id} style={{ marginBottom: 6 }}>
            <button
              className={selectedId === session.id ? 'primary-btn' : 'ghost-btn'}
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => onSelectSession(session)}
            >
              {session.title}
            </button>
          </li>
        ))}
      </ul>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>My Study Buddies</div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {connectedBuddies.length === 0 && <li style={{ color: '#aaa' }}>No buddies</li>}
        {connectedBuddies.map(buddy => (
          <li key={buddy.id} style={{ marginBottom: 6 }}>
            <button
              className={selectedId === buddy.id ? 'primary-btn' : 'ghost-btn'}
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => onSelectBuddy(buddy)}
            >
              {buddy.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

ConnectedList.propTypes = {
  connectedSessions: PropTypes.array.isRequired,
  connectedBuddies: PropTypes.array.isRequired,
  onSelectSession: PropTypes.func.isRequired,
  onSelectBuddy: PropTypes.func.isRequired,
  selectedId: PropTypes.string,
};

export default ConnectedList;
