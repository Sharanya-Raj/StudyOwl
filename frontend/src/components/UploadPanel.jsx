import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'

function UploadPanel({
  user,
  session,
  onUploadDoc,
  onSetDocumentId,
  apiBaseUrl,
  title = 'Upload study notes',
  description = 'Upload a PDF to begin an AI-guided session.'
}) {
  const fileInputRef = useRef(null)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0)
  const [documentId, setDocumentId] = useState(null)

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

        if (data.stage === 'complete') {
          clearInterval(pollInterval)
          setUploadStatus('Uploaded. Ready for an AI-guided session.')
        }
      } catch (error) {
        console.error('Error polling progress:', error)
      }
    }, 1500)

    return () => clearInterval(pollInterval)
  }, [documentId, apiBaseUrl, session])

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

      const data = await response.json()
      if (!response.ok) {
        setUploadStatus(data.error || 'Upload failed. Try again.')
        setUploadProgress(0)
        return
      }

      setDocumentId(data.documentId)
      onSetDocumentId(data.documentId, data.pdfUrl)
    } catch (error) {
      console.error('Network error during upload:', error)
      setUploadStatus('Network error. Make sure backend is running.')
      setUploadProgress(0)
    }
  }

  return (
    <div className="panel-card upload-panel">
      <h3>{title}</h3>
      <p>{description}</p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button className="primary-btn" type="button" onClick={handleUploadClick}>
        Upload PDF
      </button>
      {uploadedFileName ? (
        <p className="upload-meta">
          Selected: {uploadedFileName}
          <br />
          <span className="upload-status">{uploadStatus}</span>
          {estimatedTimeRemaining > 0 && uploadProgress < 100 ? (
            <span className="upload-time">
              ⏱️ Est. {estimatedTimeRemaining < 60 ? `${estimatedTimeRemaining}s` : `${Math.ceil(estimatedTimeRemaining / 60)}m`} remaining
            </span>
          ) : null}
        </p>
      ) : null}
      {uploadStatus ? (
        <div className="upload-progress" aria-label="Upload progress">
          <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
          <span className="upload-percent">{uploadProgress}%</span>
        </div>
      ) : null}
    </div>
  )
}

UploadPanel.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string,
  }),
  session: PropTypes.shape({
    access_token: PropTypes.string,
  }),
  onUploadDoc: PropTypes.func.isRequired,
  onSetDocumentId: PropTypes.func.isRequired,
  apiBaseUrl: PropTypes.string.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
}

export default UploadPanel
