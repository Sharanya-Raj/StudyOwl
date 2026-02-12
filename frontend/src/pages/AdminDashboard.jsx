import { useEffect, useState } from 'react';
import {
  getMySessions,
  adminGetJoinRequests,
  adminAdmitUser,
  getSessionById
} from '../sim/studyOwlSim';

function AdminDashboard() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const { created } = getMySessions();
    setSessions(created);
  }, []);

  const handleSelectSession = (sessionId) => {
    setLoading(true);
    setSelectedSession(null);
    setJoinRequests([]);
    setError('');
    const { status, join_requests, message } = adminGetJoinRequests(sessionId);
    if (status === 'success') {
      setSelectedSession(getSessionById(sessionId).session);
      setJoinRequests(join_requests);
    } else {
      setError(message || 'Failed to load join requests.');
    }
    setLoading(false);
  };

  const handleAdmit = (sessionId, userId) => {
    setLoading(true);
    const { status, session, message } = adminAdmitUser(sessionId, userId);
    if (status === 'success') {
      setSelectedSession(session);
      setJoinRequests(session.join_requests);
    } else {
      setError(message || 'Failed to admit user.');
    }
    setLoading(false);
  };

  return (
    <div className="page-shell">
      <h1>Admin Dashboard</h1>
      <h2>My Sessions</h2>
      <ul>
        {sessions.map((s) => (
          <li key={s.id}>
            <button onClick={() => handleSelectSession(s.id)}>
              {s.title} ({s.status})
            </button>
          </li>
        ))}
      </ul>
      {selectedSession && (
        <div className="panel-card">
          <h3>Session: {selectedSession.title}</h3>
          <p>Status: {selectedSession.status}</p>
          <p>Location: {selectedSession.location || selectedSession.meeting_link}</p>
          <h4>Pending Join Requests</h4>
          {joinRequests.length === 0 ? (
            <p>No pending requests.</p>
          ) : (
            <ul>
              {joinRequests.map((u) => (
                <li key={u.id}>
                  {u.name} ({u.major})
                  <button onClick={() => handleAdmit(selectedSession.id, u.id)} style={{ marginLeft: 8 }}>
                    Admit
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}

export default AdminDashboard;
