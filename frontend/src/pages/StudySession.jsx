
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
    const newSession = {
      id: 'user-' + Date.now(),
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
    closeCreateModal();
  };

  // Find selected session or buddy
  const selectedSession = connectedSessions.find(s => s.id === selectedId);
  const selectedBuddy = connectedBuddies.find(b => b.id === selectedId);
  const chat = chatMessages[selectedId] || [];

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
                    onViewDetails={handleViewDetails}
                  />
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

export default StudySession;