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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
        {showOnlyBuddies
          ? studyBuddies.map(buddy => (
              <div key={buddy.id} className="panel-card" style={{ minWidth: 240, background: 'var(--panel)', borderRadius: 16, boxShadow: '0 8px 18px rgba(107, 79, 57, 0.08)', padding: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{buddy.name}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>{buddy.class}</div>
                <button className="primary-btn" style={{ marginTop: 8, width: '100%' }} onClick={() => onRequestInvite(buddy, 'buddy')}>Request Invite</button>
              </div>
            ))
          : sessions.map(session => (
              <div key={session.id} className="panel-card" style={{ minWidth: 240, background: 'var(--panel)', borderRadius: 16, boxShadow: '0 8px 18px rgba(107, 79, 57, 0.08)', padding: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{session.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>{session.class} | {session.date} {session.time}</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>{session.location}</div>
                <button className="primary-btn" style={{ marginTop: 8, width: '100%' }} onClick={() => onRequestInvite(session, 'session')}>Request Invite</button>
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
