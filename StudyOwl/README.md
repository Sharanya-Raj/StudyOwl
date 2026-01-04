# 🎨 StudyOwl Frontend

React + Vite frontend for the StudyOwl document analysis platform.

## 📋 What It Does

1. **Upload documents** - Drag-and-drop PDF upload with progress tracking
2. **Preview documents** - Embedded PDF viewer
3. **Chat interface** - Ask questions about document content
4. **Study features** - Planned: flashcards, quizzes, techniques

## 🚀 Setup

### Install
```bash
npm install
```

### Run Development
```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

### Build for Production
```bash
npm run build
```

## 📁 File Structure

```
StudyOwl/
├── src/
│   ├── pages/
│   │   ├── Home.jsx           # Upload interface + progress
│   │   ├── Login.jsx          # Authentication (placeholder)
│   │   ├── Signup.jsx         # Registration (placeholder)
│   │   └── StudySession.jsx   # Chat + document preview
│   ├── components/
│   │   ├── AuthLayout.jsx     # Auth page layout
│   │   ├── InputField.jsx     # Form input component
│   │   └── Login.jsx          # Login form
│   ├── assets/                # Images, icons
│   ├── App.jsx                # Main app component
│   ├── App.css                # Global styles
│   ├── index.css              # Base styles
│   └── main.jsx               # Entry point
├── public/                    # Static assets
├── index.html
├── vite.config.js
├── eslint.config.js
├── package.json
└── README.md
```

## 🎯 Pages

### Home (`pages/Home.jsx`)
**Upload & Progress Interface**

Features:
- Drag-and-drop PDF upload
- Form inputs for studentId, courseId, document name
- Real-time progress bar (percentage + time estimate)
- Polling-based status updates every 500ms
- Automatic redirect to StudySession on completion

**API Usage:**
```javascript
POST /api/documents
GET /api/documents/:documentId/status
```

---

### StudySession (`pages/StudySession.jsx`)
**Chat & Document Preview**

Features:
- Split layout: PDF preview (left) + chat panel (right)
- Embedded PDF viewer
- Chat message history
- Mode switcher: Chat vs Study Techniques
- Message input with Enter key support
- Loading state management

**API Usage:**
```javascript
POST /api/chat (with optional pageNumber)
```

**Response Rendering:**
- HTML-safe rendering of `<strong>` tags
- Line breaks via `<br />` tags
- Styled chat bubbles with gradients

---

### Login/Signup (`pages/Login.jsx`, `pages/Signup.jsx`)
**Authentication (Placeholder)**

Currently placeholder components. Can integrate:
- Firebase Auth
- Azure AD B2C
- Custom JWT auth

---

## 🎨 Styling

**Global Styles** (`App.css`):
- Dark theme: Navy blues (#0f172a, #0b1020) + gradients
- Accent colors: Cyan (#7dd3fc), Pink (#c084fc)
- 12px base font, 1.6 line height

**Color Palette:**
- Background: #0f172a (dark blue)
- Surface: #1f2937 (gray)
- Text: #e5e7eb (light gray)
- Accent: #7dd3fc (cyan)
- Highlight: #c084fc (pink)

**Chat Bubbles:**
- User: Cyan-pink gradient
- Assistant: Gray background with border
- Padding: 16px 18px
- Line height: 1.7
- Font size: 15px
- `<strong>` tags: Bold + lighter color

**Responsive:**
- Desktop: Two-column layout (doc preview + chat)
- Mobile: Single column (doc preview collapses)

## 🔧 Components

### InputField (`components/InputField.jsx`)
Reusable form input component.

```jsx
<InputField 
  label="Document Name"
  value={docName}
  onChange={(e) => setDocName(e.target.value)}
/>
```

### AuthLayout (`components/AuthLayout.jsx`)
Layout wrapper for auth pages (hero + form).

---

## 📡 API Communication

**Base URL:** `http://localhost:8888`

### Upload Document
```javascript
const formData = new FormData()
formData.append('file', file)
formData.append('studentId', studentId)
formData.append('courseId', courseId)

const response = await fetch('http://localhost:8888/api/documents', {
  method: 'POST',
  body: formData
})
```

### Check Upload Status
```javascript
const response = await fetch(
  `http://localhost:8888/api/documents/${documentId}/status`
)
const { status, progress, estimatedTimeRemaining } = await response.json()
```

### Send Chat Message
```javascript
const response = await fetch('http://localhost:8888/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentId,
    message: userInput,
    conversationHistory: messages,
    pageNumber: currentPage  // Optional
  })
})
const { reply } = await response.json()
```

---

## 🎯 Key Features

### Upload Progress
- **Polling:** Every 500ms check status endpoint
- **Progress Bar:** Shows percentage + time estimate
- **Auto-redirect:** Goes to StudySession when done

### Chat Interface
- **Message History:** Keep track of conversation
- **Loading State:** Show "Thinking..." while waiting
- **Auto-scroll:** Scroll to latest message
- **Disabled Submit:** When loading or input empty
- **Enter Key:** Send message with Enter

### Document Preview
- **PDF Viewer:** Embedded via `<embed>` tag
- **Image Support:** Handles image documents
- **Fallback:** Shows placeholder for other types

### Responsive Design
- **Desktop (>900px):** 2-column layout
- **Mobile (<900px):** Single column (stacked)
- **Chat Container:** 70vh height with scrolling

---

## 🚀 Development

### Hot Module Replacement (HMR)
Vite automatically updates changes without full reload.

### ESLint Configuration
Basic React rules enabled. Customize in `eslint.config.js`

### Add Dependencies
```bash
npm install react-router-dom
npm install axios
```

---

## 🔍 Debugging

**Console Logs:**
- `Chat error:` - API failures
- `PDF URL:` - Document preview

**Network Tab:**
- Monitor POST `/api/documents` (upload)
- Monitor GET `/api/documents/:id/status` (polling)
- Monitor POST `/api/chat` (messages)

**React DevTools:**
- Inspect component state (messages, loading, input)
- Check re-render performance

---

## 🐛 Known Issues & TODOs

- [ ] Authentication not implemented
- [ ] Page number integration (get current page from PDF viewer)
- [ ] Conversation memory persistence
- [ ] Error recovery for failed uploads
- [ ] Mobile optimizations for chat input
- [ ] Flashcard generation UI
- [ ] Quiz generation UI
- [ ] Study techniques page

---

## 🔮 Future Enhancements

1. **Advanced PDF Viewer** - Current page tracking, annotations
2. **Offline Mode** - Cache documents locally
3. **Dark/Light Theme Toggle**
4. **User Preferences** - Font size, theme, etc.
5. **Export Options** - PDF, markdown, flashcards
6. **Study Analytics** - Track progress, time spent
7. **Collaborative Features** - Share documents with classmates
8. **Mobile App** - React Native version

---

## 📝 Notes

- Backend must be running on port 8888
- CORS configured to allow localhost
- Image documents supported (not just PDFs)
- Chat respects page context automatically

---

## 🤝 Contributing

Areas to improve:
- Better error UI
- More input validation
- Accessibility improvements
- Performance optimization
- Test coverage
