
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

  // Fake data mapping for new component props
  const sessions = fakeSessions.map(s => ({
    ...s,
    title: s.class,
    time: s.timing,
    location: s.details,
  }));
  const studyBuddies = fakeBuddies.map(b => ({ ...b, class: 'StudyOwl', title: b.name }));
  const connectedSessions = sessions.filter(s => s.connected);
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
          onCreateSession={() => alert('Session creation not implemented.')}
          onViewConnected={() => setViewMode('connected')}
          onFindSessions={() => setViewMode('find')}
          viewMode={viewMode}
        />
        {viewMode === 'find' && (
          <AvailableSessionsList
            sessions={filteredSessions}
            studyBuddies={studyBuddies}
            showOnlyBuddies={showOnlyBuddies}
            onToggleBuddies={() => setShowOnlyBuddies(b => !b)}
            onRequestInvite={handleRequestInvite}
          />
        )}
        {viewMode === 'connected' && (
          <div style={{ display: 'flex', gap: 24, minHeight: 350 }}>
            <ConnectedList
              connectedSessions={connectedSessions}
              connectedBuddies={connectedBuddies}
              onSelectSession={s => setSelectedId(s.id)}
              onSelectBuddy={b => setSelectedId(b.id)}
              selectedId={selectedId}
            />
            <div style={{ flex: 1 }}>
              {selectedId ? (
                <SessionChat
                  sessionOrBuddy={selectedSession || selectedBuddy}
                  chat={chat}
                  onSendMessage={handleSendMessage}
                  onViewDetails={handleViewDetails}
                />
              ) : (
                <div className="ss-empty ss-chat-empty">Select a session or buddy to start chatting.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default StudySession;