import React from 'react';
import PropTypes from 'prop-types';

function AvailableSessionsList({ sessions, studyBuddies, showOnlyBuddies, onToggleBuddies, onRequestInvite }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>
          <input type="checkbox" checked={showOnlyBuddies} onChange={onToggleBuddies} />
          Show only StudyOwls (buddies)
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {showOnlyBuddies
          ? studyBuddies.map(buddy => (
              <div key={buddy.id} className="session-card" style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, minWidth: 220 }}>
                <div style={{ fontWeight: 600 }}>{buddy.name}</div>
                <div style={{ fontSize: 13, color: '#888' }}>{buddy.class}</div>
                <button className="primary-btn" style={{ marginTop: 8 }} onClick={() => onRequestInvite(buddy, 'buddy')}>Request Invite</button>
              </div>
            ))
          : sessions.map(session => (
              <div key={session.id} className="session-card" style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, minWidth: 220 }}>
                <div style={{ fontWeight: 600 }}>{session.title}</div>
                <div style={{ fontSize: 13, color: '#888' }}>{session.class} | {session.date} {session.time}</div>
                <div style={{ fontSize: 13 }}>{session.location}</div>
                <button className="primary-btn" style={{ marginTop: 8 }} onClick={() => onRequestInvite(session, 'session')}>Request Invite</button>
              </div>
            ))}
      </div>
    </div>
  );
}

AvailableSessionsList.propTypes = {
  sessions: PropTypes.array.isRequired,
  studyBuddies: PropTypes.array.isRequired,
  showOnlyBuddies: PropTypes.bool.isRequired,
  onToggleBuddies: PropTypes.func.isRequired,
  onRequestInvite: PropTypes.func.isRequired,
};

export default AvailableSessionsList;
