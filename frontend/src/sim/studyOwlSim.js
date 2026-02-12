// StudyOwl Simulation Agent Module
// Simulates backend for local development

const AARYA_ID = 'user-aarya-raj';
const USERS = [
  { id: AARYA_ID, name: 'Aarya Raj', major: 'Neuroscience', courses: ['BIO 201', 'PSY 101'], availability: 'available', initials: 'AR' },
  { id: 'user-susan', name: 'Susan Lee', major: 'Economics', courses: ['ECON 101', 'MATH 221'], availability: 'available', initials: 'SL' },
  { id: 'user-jake', name: 'Jake Trivedi', major: 'Math', courses: ['MATH 221', 'CS 101'], availability: 'away', initials: 'JT' },
  { id: 'user-michelle', name: 'Michelle Ross', major: 'Biology', courses: ['BIO 201', 'CHEM 110'], availability: 'available', initials: 'MR' },
  { id: 'user-naina', name: 'Naina Raj', major: 'Physics', courses: ['PHYS 101', 'MATH 221'], availability: 'available', initials: 'NR' },
  { id: 'user-mia', name: 'Mia Shah', major: 'CS', courses: ['CS 101', 'MATH 221'], availability: 'away', initials: 'MS' },
];

let SESSIONS = [
  {
    id: 'session-1',
    title: 'BIO 201 - Exam Review',
    host: AARYA_ID,
    status: 'scheduled',
    start_time: '2026-02-12T18:00:00Z',
    location: 'Library Room 204',
    meeting_link: '',
    participants: [USERS[1], USERS[2], USERS[0]], // Susan, Jake, and Aarya (the user) are accepted
    join_requests: [USERS[3]], // Michelle is requesting
    notes: '',
    chat: [
      { sender: 'Susan Lee', text: 'Ready for the review session?', time: '17:55' },
      { sender: 'Jake Trivedi', text: 'I’ll bring my notes.', time: '17:56' },
      { sender: 'Aarya Raj', text: 'See you all there!', time: '17:57' },
    ],
  },
  {
    id: 'session-2',
    title: 'MATH 221 - Problem Set',
    host: 'user-susan',
    status: 'live',
    start_time: '2026-02-11T20:00:00Z',
    location: '',
    meeting_link: 'https://meet.example.com/math221',
    participants: [USERS[1], USERS[4], USERS[0]], // Susan, Naina, and Aarya
    join_requests: [],
    notes: 'Focus on integrals.',
    chat: [
      { sender: 'Susan Lee', text: 'Let’s start with question 3.', time: '18:01' },
      { sender: 'Naina Raj', text: 'I have a doubt on Q2.', time: '18:02' },
      { sender: 'Aarya Raj', text: 'I can help with that!', time: '18:03' },
    ],
  },
];

let INVITES = [
  { id: 'invite-1', from: 'user-susan', to: AARYA_ID, session_id: 'session-2', status: 'pending' },
];

export function getStudyBuddies(filter = {}) {
  // Filter by course or availability
  let buddies = USERS.filter(u => u.id !== AARYA_ID);
  if (filter.course) buddies = buddies.filter(u => u.courses.includes(filter.course));
  if (filter.availability) buddies = buddies.filter(u => u.availability === filter.availability);
  return { status: 'success', study_buddies: buddies };
}

export function getMySessions() {
  // Sessions created by Aarya or joined
  const created = SESSIONS.filter(s => s.host === AARYA_ID);
  const joined = SESSIONS.filter(s => s.participants.some(p => p.id === AARYA_ID));
  return { status: 'success', created, joined };
}

export function createSession({ title, start_time, location, meeting_link }) {
  const newSession = {
    id: `session-${Date.now()}`,
    title,
    host: AARYA_ID,
    status: 'scheduled',
    start_time,
    location,
    meeting_link,
    participants: [],
    join_requests: [],
    notes: '',
    chat: [],
  };
  SESSIONS.push(newSession);
  return { status: 'success', session: newSession };
}

export function getSessionById(session_id) {
  const session = SESSIONS.find(s => s.id === session_id);
  if (!session) return { status: 'error', message: 'Session not found' };
  return { status: 'success', session };
}

export function requestToJoinSession(session_id, user_id) {
  const session = SESSIONS.find(s => s.id === session_id);
  const user = USERS.find(u => u.id === user_id);
  if (!session || !user) return { status: 'error', message: 'Not found' };
  session.join_requests.push(user);
  return { status: 'success', session };
}

export function adminGetJoinRequests(session_id) {
  const session = SESSIONS.find(s => s.id === session_id);
  if (!session) return { status: 'error', message: 'Session not found' };
  return { status: 'success', join_requests: session.join_requests };
}

export function adminAdmitUser(session_id, user_id) {
  const session = SESSIONS.find(s => s.id === session_id);
  const user = USERS.find(u => u.id === user_id);
  if (!session || !user) return { status: 'error', message: 'Not found' };
  session.participants.push(user);
  session.join_requests = session.join_requests.filter(u => u.id !== user_id);
  session.chat.push({ sender: 'System', text: `${user.name} joined the session.`, time: new Date().toLocaleTimeString() });
  return { status: 'success', session };
}

export function sendInvite(to_user_id, session_id) {
  INVITES.push({ id: `invite-${Date.now()}`, from: AARYA_ID, to: to_user_id, session_id, status: 'pending' });
  return { status: 'success' };
}

export function getInvites() {
  return { status: 'success', invites: INVITES.filter(i => i.to === AARYA_ID || i.from === AARYA_ID) };
}

export function sendMessage(session_id, sender_id, text) {
  const session = SESSIONS.find(s => s.id === session_id);
  const user = USERS.find(u => u.id === sender_id);
  if (!session || !user) return { status: 'error', message: 'Not found' };
  session.chat.push({ sender: user.name, text, time: new Date().toLocaleTimeString() });
  return { status: 'success', chat: session.chat };
}
