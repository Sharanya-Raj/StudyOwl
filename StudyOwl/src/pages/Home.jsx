import PropTypes from 'prop-types'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function Home({ user, onLogout, onUploadDoc, onSetDocumentId }) {
  const fileInputRef = useRef(null)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
   const [uploadProgress, setUploadProgress] = useState(0)
  const navigate = useNavigate()

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFileName(file.name)
    setUploadStatus('Uploading...')
    setUploadProgress(0)

    // Store file object in App state
    const result = onUploadDoc(file)
    if (!result?.ok) {
      setUploadStatus(result?.message || 'Upload failed. Try again.')
      return
    }

    // Simulate progress and upload to backend
    let progress = 0
    const intervalId = setInterval(() => {
      progress = Math.min(progress + 12, 90)
      setUploadProgress(progress)
    }, 120)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('studentId', user?.email || 'anonymous')
      formData.append('courseId', 'default-course')

      console.log('Starting upload to backend...')
      const response = await fetch('http://localhost:8888/api/documents', {
        method: 'POST',
        body: formData,
      })

      console.log('Upload response status:', response.status)
      const data = await response.json()
      console.log('Upload response data:', data)
      console.log('PDF URL from backend:', data.pdfUrl)

      clearInterval(intervalId)

      if (!response.ok) {
        setUploadStatus(data.error || 'Upload failed. Try again.')
        setUploadProgress(0)
        console.error('Upload failed:', data)
        return
      }

      console.log('Upload successful. DocumentId:', data.documentId)
      console.log('Calling onSetDocumentId with pdfUrl:', data.pdfUrl)
      setUploadProgress(100)
      setUploadStatus('Uploaded. Ready for an AI-guided session.')
      onSetDocumentId(data.documentId, data.pdfUrl)
      setTimeout(() => navigate('/study'), 500)
    } catch (error) {
      clearInterval(intervalId)
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
          <h1 className="home-title">Welcome to StudyOwl{user?.email ? `, ${user.email}` : ''}</h1>
          <p className="home-subtitle">
            This is a lightweight placeholder home. Swap in your real dashboard
            content when ready.
          </p>
        </div>
        <div className="home-actions">
          <Link className="ghost-btn" to="/login" onClick={onLogout}>
            Sign out
          </Link>
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
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
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
            </p>
          ) : null}
          {uploadStatus ? (
            <div className="upload-progress" aria-label="Upload progress">
              <div
                className="upload-progress-bar"
                style={{ width: `${uploadProgress}%` }}
              />
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
  }),
  onLogout: PropTypes.func.isRequired,
  onUploadDoc: PropTypes.func.isRequired,
  onSetDocumentId: PropTypes.func.isRequired,
}

export default Home
