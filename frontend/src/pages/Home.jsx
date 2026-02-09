import PropTypes from 'prop-types'
import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
function Home({ user, session, onLogout, onUploadDoc, onSetDocumentId }) {
  const fileInputRef = useRef(null)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0)
  const [documentId, setDocumentId] = useState(null)
  const navigate = useNavigate()
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888'

  // Poll for progress updates
  useEffect(() => {
    if (!documentId) return

    const pollInterval = setInterval(async () => {
      try {
        const token = session?.access_token
        if (!token) return

        const response = await fetch(`${apiBaseUrl}/api/documents/${documentId}/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) {
          clearInterval(pollInterval)
          return
        }

        const data = await response.json()
        setUploadProgress(data.progress)
        setEstimatedTimeRemaining(data.estimatedRemainingSeconds)
        setUploadStatus(data.message || `Processing... ${data.stage}`)

        // If complete, stop polling
        if (data.stage === 'complete') {
          clearInterval(pollInterval)
          setUploadStatus('Uploaded. Ready for an AI-guided session.')
        }
      } catch (error) {
        console.error('Error polling progress:', error)
      }
    }, 1500)

    return () => clearInterval(pollInterval)
  }, [documentId])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setUploadStatus('Only PDF files are supported right now.')
      setUploadProgress(0)
      return
    }

    setUploadedFileName(file.name)
    setUploadStatus('Starting upload...')
    setUploadProgress(0)
    setEstimatedTimeRemaining(0)

    // Store file object in App state
    const result = onUploadDoc(file)
    if (!result?.ok) {
      setUploadStatus(result?.message || 'Upload failed. Try again.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('studentId', user?.email || 'anonymous')
      formData.append('courseId', 'default-course')

      console.log('Starting upload to backend...')
      const token = session?.access_token
      if (!token) {
        setUploadStatus('Sign-in required to upload this document.')
        setUploadProgress(0)
        return
      }

      const response = await fetch(`${apiBaseUrl}/api/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      console.log('Upload response status:', response.status)
      const data = await response.json()
      console.log('Upload response data:', data)
      console.log('PDF URL from backend:', data.pdfUrl)

      if (!response.ok) {
        setUploadStatus(data.error || 'Upload failed. Try again.')
        setUploadProgress(0)
        console.error('Upload failed:', data)
        return
      }

      console.log('Upload successful. DocumentId:', data.documentId)
      // Set document ID to trigger polling
      setDocumentId(data.documentId)
      
      // Store document ID and navigate after a short delay
      console.log('Calling onSetDocumentId with pdfUrl:', data.pdfUrl)
      onSetDocumentId(data.documentId, data.pdfUrl)
      setTimeout(() => navigate('/study'), 1000)
    } catch (error) {
      console.error('Network error during upload:', error)
      setUploadStatus('Network error. Make sure backend (http://localhost:8888) is running.')
      setUploadProgress(0)
    }
  }

  return (
    <main className="home-page">
      <header className="home-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="home-title">
            Welcome to StudyOwl{user?.name || user?.email ? `, ${user?.name || user?.email}` : ''}
          </h1>
          <p className="home-subtitle">
            This is a lightweight placeholder home. Swap in your real dashboard
            content when ready.
          </p>
        </div>
        <div className="home-actions">
          <button className="ghost-btn" type="button" onClick={onLogout}>
            Sign out
          </button>
          <button className="primary-btn" type="button">
            Add study goal
          </button>
        </div>
      </header>

      <section className="home-grid">
        <div className="card">
          <h3>Smart Study</h3>
          <p>Upload notes to launch an AI-guided study session with tailored prompts.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button className="primary-btn" type="button" style={{ marginTop: '10px' }} onClick={handleUploadClick}>
            Upload notes
          </button>
          {uploadedFileName ? (
            <p className="upload-meta">
              Selected: {uploadedFileName}
              <br />
              <span className="upload-status">{uploadStatus}</span>
              {estimatedTimeRemaining > 0 && uploadProgress < 100 && (
                <br />
              )}
              {estimatedTimeRemaining > 0 && uploadProgress < 100 && (
                <span className="upload-time">
                  ⏱️ Est. {estimatedTimeRemaining < 60 ? estimatedTimeRemaining + 's' : Math.ceil(estimatedTimeRemaining / 60) + 'm'} remaining
                </span>
              )}
            </p>
          ) : null}
          {uploadStatus ? (
            <div className="upload-progress" aria-label="Upload progress">
              <div
                className="upload-progress-bar"
                style={{ width: `${uploadProgress}%` }}
              />
              <span className="upload-percent">{uploadProgress}%</span>
            </div>
          ) : null}
        </div>
        <div className="card">
          <h3>Progress</h3>
          <p>Track your streaks and time spent.</p>
        </div>
        <div className="card">
          <h3>Notes</h3>
          <p>Keep quick notes or reminders.</p>
        </div>
      </section>
    </main>
  )
}

Home.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string,
    name: PropTypes.string,
  }),
  session: PropTypes.shape({
    access_token: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
  onUploadDoc: PropTypes.func.isRequired,
  onSetDocumentId: PropTypes.func.isRequired,
}

export default Home
