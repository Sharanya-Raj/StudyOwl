import React from 'react';
import PropTypes from 'prop-types';

function SessionFilterBar({
  filter, setFilter, onCreateSession, onViewConnected, onFindSessions, viewMode
}) {
  return (
    <div className="session-filter-bar" style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
      <select
        value={filter.class}
        onChange={e => setFilter(f => ({ ...f, class: e.target.value }))}
        style={{ padding: 6 }}
      >
        <option value="">All Classes</option>
        <option value="Math">Math</option>
        <option value="Physics">Physics</option>
        <option value="Chemistry">Chemistry</option>
        <option value="History">History</option>
      </select>
      <input
        type="date"
        value={filter.date}
        onChange={e => setFilter(f => ({ ...f, date: e.target.value }))}
        style={{ padding: 6 }}
      />
      <input
        type="time"
        value={filter.time}
        onChange={e => setFilter(f => ({ ...f, time: e.target.value }))}
        style={{ padding: 6 }}
      />
      <button className={viewMode === 'find' ? 'primary-btn' : 'ghost-btn'} onClick={onFindSessions}>
        Find Sessions
      </button>
      <button className={viewMode === 'connected' ? 'primary-btn' : 'ghost-btn'} onClick={onViewConnected}>
        My Sessions & Buddies
      </button>
      <button className="primary-btn" onClick={onCreateSession}>
        + Create Session
      </button>
    </div>
  );
}

SessionFilterBar.propTypes = {
  filter: PropTypes.object.isRequired,
  setFilter: PropTypes.func.isRequired,
  onCreateSession: PropTypes.func.isRequired,
  onViewConnected: PropTypes.func.isRequired,
  onFindSessions: PropTypes.func.isRequired,
  viewMode: PropTypes.string.isRequired,
};

export default SessionFilterBar;
