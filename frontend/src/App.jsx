import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import AdminDashboard from './pages/AdminDashboard'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Signup from './pages/Signup'
import StudySession from './pages/StudySession'
import Workspace from './pages/Workspace'
import { supabase } from './auth/supabaseClient'

function App() {
  const [studyDoc, setStudyDoc] = useState(null)
  const [session, setSession] = useState(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    return () => {
      if (studyDoc?.url) URL.revokeObjectURL(studyDoc.url)
    }
  }, [studyDoc])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setIsReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      isMounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const user = useMemo(() => {
    if (!session?.user) return null
    const profile = session.user.user_metadata || {}
    return {
      name: profile.full_name || session.user.email,
      email: session.user.email,
      id: session.user.id,
    }
  }, [session])

  const handleDocUpload = (file) => {
    if (!file) return { ok: false, message: 'Please select a file to upload.' }

    const nextUrl = URL.createObjectURL(file)
    setStudyDoc((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return { name: file.name, type: file.type, url: nextUrl, file, documentId: null }
    })

    return { ok: true }
  }

  const setDocumentId = (documentId, pdfUrl) => {
    console.log('setDocumentId called with:', { documentId, pdfUrl })
    setStudyDoc((prev) => {
      const updated = prev ? { ...prev, documentId, url: pdfUrl || prev.url } : null
      console.log('Updated studyDoc:', updated)
      return updated
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const isAuthed = Boolean(session?.user)

  return (
    <div className="app-shell">
      <Routes>
        <Route
          path="/"
          element={
            !isReady ? (
              <div className="home-page">
                <div className="card">Loading session...</div>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            !isReady ? (
              <div className="home-page">
                <div className="card">Loading session...</div>
              </div>
            ) : isAuthed ? (
              <Navigate to="/home" replace />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/signup"
          element={
            !isReady ? (
              <div className="home-page">
                <div className="card">Loading session...</div>
              </div>
            ) : isAuthed ? (
              <Navigate to="/home" replace />
            ) : (
              <Signup />
            )
          }
        />
        <Route
          path="/home"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/dashboard"
          element={
            !isReady ? (
              <div className="home-page">
                <div className="card">Loading session...</div>
              </div>
            ) : isAuthed ? (
              <Home
                user={user}
                session={session}
                onLogout={handleLogout}
                onUploadDoc={handleDocUpload}
                onSetDocumentId={setDocumentId}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/workspace"
          element={
            !isReady ? (
              <div className="home-page">
                <div className="card">Loading session...</div>
              </div>
            ) : isAuthed ? (
              <Workspace
                user={user}
                session={session}
                onLogout={handleLogout}
                onUploadDoc={handleDocUpload}
                onSetDocumentId={setDocumentId}
                documentId={studyDoc?.documentId}
                studyDoc={studyDoc}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            !isReady ? (
              <div className="home-page">
                <div className="card">Loading session...</div>
              </div>
            ) : isAuthed ? (
              <Profile user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/study"
          element={
            !isReady ? (
              <div className="home-page">
                <div className="card">Loading session...</div>
              </div>
            ) : isAuthed ? (
              <StudySession user={user} session={session} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route
          path="/admin-dashboard"
          element={<AdminDashboard />}
        />
      </Routes>
    </div>
  )
}

export default App
