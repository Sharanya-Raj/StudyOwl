
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
import SessionFilterBar from '../components/SessionFilterBar';
import AvailableSessionsList from '../components/AvailableSessionsList';
import ConnectedList from '../components/ConnectedList';
import SessionChat from '../components/SessionChat';



const StudySession = ({ user, onLogout }) => {
  // Modes: 'find', 'connected'
  const [viewMode, setViewMode] = useState('find');
  const [filter, setFilter] = useState({ class: '', date: '', time: '' });
  const [showOnlyBuddies, setShowOnlyBuddies] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [chatMessages, setChatMessages] = useState({ ...initialChat });
  const [userSessions, setUserSessions] = useState([]); // for created sessions
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [membersModalSessionId, setMembersModalSessionId] = useState(null);
  const [membersState, setMembersState] = useState({}); // { [sessionId]: {members: [], requests: []} }
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ class: '', date: '', time: '', details: '' });

  // Fake data mapping for new component props
  const sessions = [
    ...fakeSessions.map(s => ({
      ...s,
      title: s.class,
      time: s.timing,
      location: s.details,
    })),
    ...userSessions
  ];
  const studyBuddies = fakeBuddies.map(b => ({ ...b, class: 'StudyOwl', title: b.name }));
  const connectedSessions = sessions.filter(s => s.connected || s.isUserSession);
  const connectedBuddies = studyBuddies.filter(b => b.connected);

  // Filtered sessions for AvailableSessionsList
  const filteredSessions = sessions.filter(s => {
    if (s.connected) return false;
    if (showOnlyBuddies) return false;
    if (filter.class && !s.class.toLowerCase().includes(filter.class.toLowerCase())) return false;
    if (filter.date && s.date !== filter.date) return false;
    if (filter.time && s.timing !== filter.time) return false;
    return true;
  });

  // Handlers
  const handleRequestInvite = (item, type) => {
    alert(`Invite requested for ${type === 'buddy' ? 'StudyOwl' : 'session'}: ${item.title || item.name}`);
  };

  const handleSendMessage = (msg) => {
    if (!selectedId) return;
    setChatMessages(prev => ({
      ...prev,
      [selectedId]: [
        ...(prev[selectedId] || []),
        { sender: 'You', text: msg, time: new Date().toLocaleTimeString() },
      ],
    }));
  };

  const handleViewDetails = () => {
    alert('Session details popup (not implemented)');
  };

  // Modal handlers
  const openCreateModal = () => setShowCreateModal(true);
  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm({ class: '', date: '', time: '', details: '' });
  };
  const handleCreateInput = e => {
    const { name, value } = e.target;
    setCreateForm(f => ({ ...f, [name]: value }));
  };
  const handleCreateSession = e => {
    e.preventDefault();
    // Add a new fake session for the user
    const newId = 'user-' + Date.now();
    const newSession = {
      id: newId,
      class: createForm.class,
      title: createForm.class,
      timing: createForm.time,
      time: createForm.time,
      date: createForm.date,
      host: user?.name || 'You',
      details: createForm.details,
      location: createForm.details,
      connected: true,
      isUserSession: true,
      isOwl: false,
    };
    setUserSessions(prev => [...prev, newSession]);
    // Add default members/requests for demo
    setMembersState(prev => ({
      ...prev,
      [newId]: {
        members: [
          { id: 'm1', name: 'Alice', active: true },
          { id: 'm2', name: 'Bob', active: true },
        ],
        requests: [
          { id: 'r1', name: 'Charlie', accepted: false },
        ],
      },
    }));
    closeCreateModal();
  };

  // Find selected session or buddy
  const selectedSession = connectedSessions.find(s => s.id === selectedId);
  const selectedBuddy = connectedBuddies.find(b => b.id === selectedId);
  const chat = chatMessages[selectedId] || [];

  // Members modal logic
  const openMembersModal = (sessionId) => setMembersModalSessionId(sessionId);
  const closeMembersModal = () => setMembersModalSessionId(null);
  const handleMembersChange = (sessionId, newState) => {
    setMembersState(prev => ({ ...prev, [sessionId]: newState }));
  };

  return (
    <main className="page-shell">
      <TopBar user={user} onLogout={onLogout} availability="available" onToggleAvailability={() => {}} notificationsCount={0} />
      <div className="ss-center-wrap" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <SessionFilterBar
          filter={filter}
          setFilter={setFilter}
          onCreateSession={openCreateModal}
          onViewConnected={() => setViewMode('connected')}
          onFindSessions={() => setViewMode('find')}
          viewMode={viewMode}
        />
        {showCreateModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(60,40,20,0.18)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <form onSubmit={handleCreateSession} style={{
              background: 'var(--panel)',
              borderRadius: 20,
              boxShadow: '0 16px 40px rgba(107, 79, 57, 0.18)',
              padding: 32,
              minWidth: 340,
              maxWidth: 400,
              display: 'flex', flexDirection: 'column', gap: 18,
              border: '1px solid var(--panel-strong)',
            }}>
              <h2 className="rustic-title" style={{margin: 0, marginBottom: 10, fontSize: 24}}>Create Study Session</h2>
              <input
                className="field-input"
                name="class"
                placeholder="Class (e.g. Math 101)"
                value={createForm.class}
                onChange={handleCreateInput}
                required
              />
              <input
                className="field-input"
                name="date"
                type="date"
                value={createForm.date}
                onChange={handleCreateInput}
                required
              />
              <input
                className="field-input"
                name="time"
                type="time"
                value={createForm.time}
                onChange={handleCreateInput}
                required
              />
              <textarea
                className="field-input"
                name="details"
                placeholder="Session details (optional)"
                value={createForm.details}
                onChange={handleCreateInput}
                rows={3}
                style={{resize: 'vertical'}}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" className="primary-btn" style={{ flex: 1 }}>Create</button>
                <button type="button" className="ghost-btn" style={{ flex: 1 }} onClick={closeCreateModal}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        {viewMode === 'find' && (
          <div style={{ background: 'var(--panel)', borderRadius: 16, boxShadow: '0 16px 30px rgba(107, 79, 57, 0.12)', padding: 24, marginTop: 12 }}>
            <AvailableSessionsList
              sessions={filteredSessions}
              studyBuddies={studyBuddies}
              showOnlyBuddies={showOnlyBuddies}
              onToggleBuddies={() => setShowOnlyBuddies(b => !b)}
              onRequestInvite={handleRequestInvite}
            />
          </div>
        )}
        {viewMode === 'connected' && (
          <div style={{ display: 'flex', gap: 24, minHeight: 350, background: 'var(--panel)', borderRadius: 16, boxShadow: '0 16px 30px rgba(107, 79, 57, 0.12)', padding: 24, marginTop: 12 }}>
            <div style={{ minWidth: 260 }}>
              <ConnectedList
                connectedSessions={connectedSessions}
                connectedBuddies={connectedBuddies}
                onSelectSession={s => setSelectedId(s.id)}
                onSelectBuddy={b => setSelectedId(b.id)}
                selectedId={selectedId}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
              {selectedId ? (
                <div style={{ width: '100%', background: '#fff', borderRadius: 16, boxShadow: '0 8px 18px rgba(107, 79, 57, 0.08)', padding: 18, display: 'flex', flexDirection: 'column' }}>
                  <SessionChat
                    sessionOrBuddy={selectedSession || selectedBuddy}
                    chat={chat}
                    onSendMessage={handleSendMessage}
                    showMembersButton={selectedSession?.isUserSession}
                    onViewMembers={() => openMembersModal(selectedSession.id)}
                  />
                  {/* Members Modal for user-created sessions */}
                  {membersModalSessionId && (
                    <MembersModal
                      sessionId={membersModalSessionId}
                      membersState={membersState[membersModalSessionId]}
                      onClose={closeMembersModal}
                      onSave={handleMembersChange}
                    />
                  )}
                </div>
              ) : (
                <div className="ss-empty ss-chat-empty" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 18px rgba(107, 79, 57, 0.08)', padding: 18, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Select a session or buddy to start chatting.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

// --- MembersModal component ---
function MembersModal({ sessionId, membersState, onClose, onSave }) {
  const [tab, setTab] = React.useState('members');
  const [members, setMembers] = React.useState(membersState?.members || []);
  const [requests, setRequests] = React.useState(membersState?.requests || []);

  // Track toggled-off members and accepted requests
  const [removed, setRemoved] = React.useState([]); // ids
  const [accepted, setAccepted] = React.useState([]); // ids

  const handleToggleMember = (id) => {
    setRemoved(rm => rm.includes(id) ? rm.filter(x => x !== id) : [...rm, id]);
  };
  const handleAcceptRequest = (id) => {
    setAccepted(acc => acc.includes(id) ? acc : [...acc, id]);
  };
  const handleSave = () => {
    // Remove toggled-off members, add accepted requests
    const newMembers = [
      ...members.filter(m => !removed.includes(m.id)),
      ...requests.filter(r => accepted.includes(r.id)).map(r => ({ id: r.id, name: r.name, active: true })),
    ];
    const newRequests = [
      ...requests.filter(r => !accepted.includes(r.id)),
      ...members.filter(m => removed.includes(m.id)).map(m => ({ id: m.id, name: m.name, accepted: false })),
    ];
    onSave(sessionId, { members: newMembers, requests: newRequests });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(60,40,20,0.18)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--panel)', borderRadius: 20, boxShadow: '0 16px 40px rgba(107, 79, 57, 0.18)',
        padding: 28, minWidth: 340, maxWidth: 400, border: '1px solid var(--panel-strong)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button className={tab === 'members' ? 'primary-btn' : 'ghost-btn'} style={{ flex: 1 }} onClick={() => setTab('members')}>Members</button>
          <button className={tab === 'requests' ? 'primary-btn' : 'ghost-btn'} style={{ flex: 1 }} onClick={() => setTab('requests')}>Requests</button>
        </div>
        {tab === 'members' && (
          <div style={{ minHeight: 120 }}>
            {members.length === 0 && <div style={{ color: '#aaa', textAlign: 'center' }}>No members</div>}
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>{m.name}</span>
                <button
                  className="ghost-btn"
                  style={{ background: removed.includes(m.id) ? '#eee' : '#c08a3e', color: removed.includes(m.id) ? '#888' : '#fff', borderRadius: 12, minWidth: 60 }}
                  onClick={() => handleToggleMember(m.id)}
                >
                  {removed.includes(m.id) ? 'Removed' : 'Keep'}
                </button>
              </div>
            ))}
          </div>
        )}
        {tab === 'requests' && (
          <div style={{ minHeight: 120 }}>
            {requests.length === 0 && <div style={{ color: '#aaa', textAlign: 'center' }}>No requests</div>}
            {requests.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>{r.name}</span>
                <button
                  className={accepted.includes(r.id) ? 'primary-btn' : 'ghost-btn'}
                  style={{ borderRadius: 12, minWidth: 80 }}
                  onClick={() => handleAcceptRequest(r.id)}
                  disabled={accepted.includes(r.id)}
                >
                  {accepted.includes(r.id) ? 'Accepted' : 'Accept'}
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="primary-btn" style={{ flex: 1 }} onClick={handleSave}>Save</button>
          <button className="ghost-btn" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default StudySession;