import PropTypes from 'prop-types'
import { useState } from 'react'
import TopBar from '../components/TopBar'
import ChatPanel from '../components/ChatPanel'
import UploadPanel from '../components/UploadPanel'

function Workspace({ user, session, onLogout, documentId, studyDoc, onUploadDoc, onSetDocumentId }) {
  const [availability, setAvailability] = useState('available')
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888'
  const isPdf = studyDoc?.type === 'application/pdf'
  const isImage = studyDoc?.type?.startsWith('image/')

  return (
    <main className="page-shell">
      <TopBar
        user={user}
        onLogout={onLogout}
        availability={availability}
        onToggleAvailability={() =>
          setAvailability((prev) => (prev === 'available' ? 'away' : 'available'))
        }
        notificationsCount={3}
      />
      <section className="page-header">
        <div>
          <p className="eyebrow">AI Workspace</p>
          <h1 className="page-title">Turn PDFs into study momentum.</h1>
          <p className="page-subtitle">
            Upload materials, chat with the AI, and extract key notes.
          </p>
        </div>
      </section>
      <section className="workspace-grid">
        <div className="workspace-left">
          <UploadPanel
            user={user}
            session={session}
            onUploadDoc={onUploadDoc}
            onSetDocumentId={onSetDocumentId}
            apiBaseUrl={apiBaseUrl}
            title="Upload material"
            description="Add lecture notes or readings to power the AI workspace."
          />
          <ChatPanel
            documentId={documentId}
            session={session}
            apiBaseUrl={apiBaseUrl}
            title="Ask StudyOwl"
            emptyMessage="Upload a document to start asking questions."
            placeholder="Ask about key concepts, formulas, or summaries..."
          />
        </div>
        <div className="workspace-right">
          {studyDoc?.url ? (
            <div className="panel-card workspace-preview">
              <div className="panel-header">
                <h3>Document preview</h3>
                <span className="panel-pill">Uploaded</span>
              </div>
              <div className="doc-preview">
                {isPdf ? (
                  <embed src={studyDoc.url} type="application/pdf" className="doc-frame" />
                ) : isImage ? (
                  <img src={studyDoc.url} alt={studyDoc.name || 'Uploaded file'} className="doc-image" />
                ) : (
                  <iframe title="Document preview" src={studyDoc.url} className="doc-frame" />
                )}
              </div>
            </div>
          ) : (
            <div className="panel-card workspace-preview">
              <div className="panel-header">
                <h3>Document preview</h3>
                <span className="panel-pill">Waiting</span>
              </div>
              <p>Upload a document to preview it here.</p>
            </div>
          )}
          {/* Removed Extracted notes panel */}
          {/* Removed Flashcards and Concept graph panels */}
        </div>
      </section>
    </main>
  )
}

Workspace.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  session: PropTypes.shape({
    access_token: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
  documentId: PropTypes.string,
  studyDoc: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
    type: PropTypes.string,
    documentId: PropTypes.string,
  }),
  onUploadDoc: PropTypes.func.isRequired,
  onSetDocumentId: PropTypes.func.isRequired,
}

export default Workspace
