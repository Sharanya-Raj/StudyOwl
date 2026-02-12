
import React, { useState } from 'react';

// --- Fake Data ---
const fakeSessions = [
  {
    id: 1,
    class: 'Math 101',
    timing: '10:00 AM',
    date: '2026-02-13',
    host: 'Alice',
    details: 'Algebra review',
    connected: false,
    isOwl: false,
  },
  {
    id: 2,
    class: 'Physics 201',
    timing: '2:00 PM',
    date: '2026-02-14',
    host: 'Bob',
    details: 'Quantum basics',
    connected: true,
    isOwl: false,
  },
  {
    id: 3,
    class: 'StudyOwl: Charlie',
    timing: 'Flexible',
    date: '2026-02-15',
    host: 'Charlie',
    details: 'General study buddy',
    connected: false,
    isOwl: true,
  },
  {
    id: 4,
    class: 'StudyOwl: Dana',
    timing: 'Evenings',
    date: '2026-02-16',
    host: 'Dana',
    details: 'Focus on chemistry',
    connected: true,
    isOwl: true,
  },
];

const fakeBuddies = [
  { id: 'owl1', name: 'Charlie', connected: true },
  { id: 'owl2', name: 'Dana', connected: true },
];

const initialChat = {
  2: [
    { sender: 'Bob', text: 'Welcome to the session!' },
    { sender: 'You', text: 'Thanks, excited to join.' },
  ],
  4: [
    { sender: 'Dana', text: 'Ready to study chemistry?' },
  ],
};


import TopBar from '../components/TopBar';


const StudySession = ({ user, onLogout }) => {
  const [mode, setMode] = useState('choose'); // choose | find | connected
  const [filters, setFilters] = useState({ class: '', timing: '', date: '' });
  const [showOwlsOnly, setShowOwlsOnly] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState(initialChat);
  const [chatInput, setChatInput] = useState('');

  // Filtered sessions
  const availableSessions = fakeSessions.filter(s => {
    if (s.connected) return false;
    if (showOwlsOnly && !s.isOwl) return false;
    if (filters.class && !s.class.toLowerCase().includes(filters.class.toLowerCase())) return false;
    if (filters.timing && !s.timing.toLowerCase().includes(filters.timing.toLowerCase())) return false;
    if (filters.date && s.date !== filters.date) return false;
    return true;
  });

  const connectedSessions = fakeSessions.filter(s => s.connected);
  const connectedBuddies = fakeBuddies.filter(b => b.connected);

  // Handlers
  const handleFilterChange = e => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleRequestInvite = id => {
    alert('Invite requested for session/StudyOwl ID: ' + id);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !selectedSessionId) return;
    setChatMessages(prev => ({
      ...prev,
      [selectedSessionId]: [
        ...(prev[selectedSessionId] || []),
        { sender: 'You', text: chatInput },
      ],
    }));
    setChatInput('');
  };

  // UI rendering
  return (
    <main className="page-shell">
      <TopBar user={user} onLogout={onLogout} availability="available" onToggleAvailability={() => {}} notificationsCount={0} />
      <div className="ss-center-wrap">
        {mode === 'choose' && (
          <div className="ss-choose-container">
            <div className="ss-card ss-choose-card">
              <h2 className="rustic-title" style={{marginBottom: 24}}>Study Sessions</h2>
              <button className="primary-btn" onClick={() => setMode('find')}>Find a Study Session</button>
              <button className="primary-btn" style={{background: 'var(--accent-soft)', color: 'var(--accent-strong)'}} onClick={() => alert('Session creation not implemented.')}>Create My Own Session</button>
              <button className="primary-btn" style={{background: 'var(--panel-strong)', color: 'var(--accent)'}} onClick={() => setMode('connected')}>View My Sessions & Study Buddies</button>
            </div>
          </div>
        )}
        {mode === 'find' && (
          <div className="ss-main-bg">
            <div className="ss-header-row">
              <button className="ghost-btn" onClick={() => setMode('choose')}>← Back</button>
              <h2 className="rustic-title">Find an Existing Study Session</h2>
            </div>
            <div className="ss-filter-bar">
              <input
                className="ss-input"
                name="class"
                placeholder="Class (e.g. Math 101)"
                value={filters.class}
                onChange={handleFilterChange}
              />
              <input
                className="ss-input"
                name="timing"
                placeholder="Timing (e.g. 10:00 AM)"
                value={filters.timing}
                onChange={handleFilterChange}
              />
              <input
                className="ss-input"
                name="date"
                type="date"
                value={filters.date}
                onChange={handleFilterChange}
              />
              <label className="ss-checkbox-label">
                <input
                  type="checkbox"
                  checked={showOwlsOnly}
                  onChange={e => setShowOwlsOnly(e.target.checked)}
                />{' '}
                Show only StudyOwls
              </label>
            </div>
            <div className="ss-session-list">
              {availableSessions.length === 0 && <div className="ss-empty">No sessions found.</div>}
              {availableSessions.map(session => (
                <div key={session.id} className="ss-card ss-session-card">
                  <h4 className="ss-session-title">{session.class}</h4>
                  <div className="ss-session-meta"><b>Host:</b> {session.host}</div>
                  <div className="ss-session-meta"><b>Timing:</b> {session.timing}</div>
                  <div className="ss-session-meta"><b>Date:</b> {session.date}</div>
                  <div className="ss-session-meta"><b>Details:</b> {session.details}</div>
                  <button className="primary-btn" style={{marginTop: 10}} onClick={() => handleRequestInvite(session.id)}>Request Invite</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {mode === 'connected' && (
          <div className="ss-main-bg ss-connected-layout">
            <div className="ss-connected-sidebar">
              <h3 className="ss-sidebar-title">My Study Sessions</h3>
              {connectedSessions.length === 0 && <div className="ss-empty">No connected sessions.</div>}
              {connectedSessions.map(s => (
                <div
                  key={s.id}
                  className={`ss-sidebar-item${selectedSessionId === s.id ? ' ss-sidebar-item-active' : ''}`}
                  onClick={() => setSelectedSessionId(s.id)}
                >
                  <b>{s.class}</b>
                  <div className="ss-sidebar-meta">{s.timing} | {s.date}</div>
                </div>
              ))}
              <h3 className="ss-sidebar-title" style={{ marginTop: 30 }}>My Study Buddies</h3>
              {connectedBuddies.length === 0 && <div className="ss-empty">No study buddies.</div>}
              {connectedBuddies.map(b => (
                <div
                  key={b.id}
                  className={`ss-sidebar-item${selectedSessionId === b.id ? ' ss-sidebar-item-active' : ''}`}
                  onClick={() => setSelectedSessionId(b.id)}
                >
                  <b>{b.name}</b>
                </div>
              ))}
            </div>
            <div className="ss-connected-main">
              {!selectedSessionId && (
                <div className="ss-empty ss-chat-empty">Select a session or buddy to start chatting.</div>
              )}
              {selectedSessionId && (
                <div className="ss-chat-card">
                  <div className="ss-chat-header">
                    <button className="ghost-btn" onClick={() => alert('Session details popup (not implemented)')} style={{ marginRight: 12 }}>View Session Details</button>
                    <span className="ss-chat-title">
                      {(() => {
                        const s = connectedSessions.find(x => x.id === selectedSessionId);
                        if (s) return s.class + ' (' + s.timing + ')';
                        const b = connectedBuddies.find(x => x.id === selectedSessionId);
                        if (b) return b.name + ' (StudyOwl)';
                        return '';
                      })()}
                    </span>
                  </div>
                  <div className="ss-chat-messages">
                    {(chatMessages[selectedSessionId] || []).map((msg, idx) => (
                      <div key={idx} className={`ss-chat-msg${msg.sender === 'You' ? ' ss-chat-msg-self' : ''}`}>
                        <span className="ss-chat-bubble">
                          <b>{msg.sender}:</b> {msg.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="ss-chat-input-row">
                    <input
                      className="ss-input"
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                      placeholder="Type a message..."
                      disabled={!selectedSessionId}
                    />
                    <button className="primary-btn" onClick={handleSendMessage} disabled={!chatInput.trim() || !selectedSessionId}>Send</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {mode !== 'choose' && mode !== 'find' && mode !== 'connected' && (
          <div className="ss-main-bg"><div className="ss-empty">Loading...</div></div>
        )}
      </div>
    </main>
  );
};

export default StudySession;