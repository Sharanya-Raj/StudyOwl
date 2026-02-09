import PropTypes from 'prop-types'
import { useState } from 'react'
import TopBar from '../components/TopBar'
import ChatPanel from '../components/ChatPanel'
import UploadPanel from '../components/UploadPanel'

function Workspace({ user, session, onLogout, documentId, onUploadDoc, onSetDocumentId }) {
  const [availability, setAvailability] = useState('available')
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888'

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
          <div className="panel-card">
            <div className="panel-header">
              <h3>Extracted notes</h3>
              <span className="panel-pill">Coming soon</span>
            </div>
            <p>Summary highlights and section notes will appear here after processing.</p>
          </div>
          <div className="panel-card">
            <div className="panel-header">
              <h3>Flashcards</h3>
              <span className="panel-pill">Coming soon</span>
            </div>
            <p>Generate flashcards from key definitions and formulas.</p>
          </div>
          <div className="panel-card">
            <div className="panel-header">
              <h3>Concept graph</h3>
              <span className="panel-pill">Coming soon</span>
            </div>
            <p>Map relationships between concepts once vector embeddings are ready.</p>
          </div>
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
  onUploadDoc: PropTypes.func.isRequired,
  onSetDocumentId: PropTypes.func.isRequired,
}

export default Workspace
