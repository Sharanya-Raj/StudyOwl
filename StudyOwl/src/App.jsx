import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import StudySession from './pages/StudySession'

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('authUser')
    return stored ? JSON.parse(stored) : null
  })

  const [accounts, setAccounts] = useState(() => {
    const stored = localStorage.getItem('authAccounts')
    return stored ? JSON.parse(stored) : []
  })

  const [studyDoc, setStudyDoc] = useState(null)

  useEffect(() => {
    if (user) {
      localStorage.setItem('authUser', JSON.stringify(user))
    } else {
      localStorage.removeItem('authUser')
    }
  }, [user])

  useEffect(() => {
    localStorage.setItem('authAccounts', JSON.stringify(accounts))
  }, [accounts])

  useEffect(() => {
    return () => {
      if (studyDoc?.url) URL.revokeObjectURL(studyDoc.url)
    }
  }, [studyDoc])

  const handleLogin = ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const existing = accounts.find((account) => account.email === normalizedEmail)

    if (!existing) {
      return { ok: false, message: 'No account found. Please create one first.' }
    }

    if (existing.password !== password) {
      return { ok: false, message: 'Incorrect password. Try again.' }
    }

    setUser({ email: normalizedEmail, name: existing.name })
    return { ok: true }
  }

  const handleSignup = ({ email, name, password }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    if (accounts.some((account) => account.email === normalizedEmail)) {
      return { ok: false, message: 'Account already exists. Please sign in instead.' }
    }

    const newAccount = { email: normalizedEmail, name: trimmedName, password }
    setAccounts((prev) => [...prev, newAccount])
    setUser({ email: normalizedEmail, name: trimmedName })
    return { ok: true }
  }

  const handleDocUpload = (file) => {
    if (!file) return { ok: false, message: 'Please select a file to upload.' }

    const nextUrl = URL.createObjectURL(file)
    setStudyDoc((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return { name: file.name, type: file.type, url: nextUrl, file, documentId: null }
    })

    return { ok: true }
  }

  const setDocumentId = (documentId) => {
    setStudyDoc((prev) => (prev ? { ...prev, documentId } : null))
  }

  const handleLogout = () => setUser(null)

  const isAuthed = Boolean(user)

  return (
    <div className="app-shell">
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuthed ? '/home' : '/login'} replace />}
        />
        <Route
          path="/login"
          element={
            isAuthed ? (
              <Navigate to="/home" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            isAuthed ? (
              <Navigate to="/home" replace />
            ) : (
              <Signup onSignup={handleSignup} />
            )
          }
        />
        <Route
          path="/home"
          element={
            isAuthed ? (
              <Home user={user} onLogout={handleLogout} onUploadDoc={handleDocUpload} onSetDocumentId={setDocumentId} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/study"
          element={
            isAuthed ? (
              studyDoc ? (
                <StudySession doc={studyDoc} user={user} />
              ) : (
                <Navigate to="/home" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
