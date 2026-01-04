# 📚 StudyOwl

An intelligent document analysis and learning platform that leverages AI to help students understand complex academic materials through semantic search, graph interpretation, and interactive chat.

## 🎯 Features

- **Smart Document Upload**: Process PDFs with automatic chunking and intelligent splitting (handles Azure Document Intelligence's 2-page limitation)
- **Graph Interpretation**: Automatically detects and interprets graphs with domain-specific templates for:
  - Economics (supply/demand, cost curves, labor markets)
  - Calculus (derivatives, integrals, critical points)
  - Biology (population growth, enzyme kinetics, photosynthesis)
  - Chemistry (titration curves, reaction rates, phase diagrams)
  - Physics (position/velocity graphs, force diagrams, energy conservation)
- **Semantic Search**: TF-IDF-based retrieval with graph-aware prioritization
- **AI Chat**: Groq-powered conversational interface for document Q&A
- **Progress Tracking**: Real-time upload progress with time estimates
- **Page Context**: Automatic page hint detection and ±1 page filtering for accurate context

## 🏗️ Project Structure

```
StudyOwl/
├── backend/                  # Express.js API server
│   ├── src/
│   │   ├── index.js         # Main server + all endpoints
│   │   └── chunkText.js     # Text chunking generator
│   ├── .env                 # Environment variables
│   └── package.json
├── StudyOwl/                # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx     # Upload interface
│   │   │   ├── Login.jsx    # Authentication
│   │   │   └── StudySession.jsx  # Chat interface
│   │   ├── components/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   └── package.json
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Azure Document Intelligence API key
- Groq API key
- Azure Blob Storage connection string
- Azure Cosmos DB connection string

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
PORT=8888
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-70b-versatile
AZURE_FORM_RECOGNIZER_ENDPOINT=https://eastus2.api.cognitive.microsoft.com/
AZURE_FORM_RECOGNIZER_KEY=your_key
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_COSMOSDB_CONNECTION_STRING=your_connection_string
EOF

npm start
```

Backend runs on `http://localhost:8888`

### Frontend Setup

```bash
cd StudyOwl
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## 🔑 Environment Variables

**Backend (.env):**
- `PORT` - Server port (default: 8888)
- `GROQ_API_KEY` - Groq API key for LLM inference
- `GROQ_MODEL` - Model ID (default: llama-3.1-70b-versatile)
- `AZURE_FORM_RECOGNIZER_ENDPOINT` - Document Intelligence endpoint
- `AZURE_FORM_RECOGNIZER_KEY` - Document Intelligence API key
- `AZURE_STORAGE_CONNECTION_STRING` - Blob Storage credentials
- `AZURE_COSMOSDB_CONNECTION_STRING` - Cosmos DB credentials

## 📡 API Endpoints

### POST `/api/documents`
Upload and process a PDF document.

**Request:**
```json
{
  "file": "multipart/form-data",
  "studentId": "string",
  "courseId": "string"
}
```

**Response:**
```json
{
  "documentId": "uuid",
  "message": "Document uploaded successfully"
}
```

### POST `/api/chat`
Chat about a document with semantic context retrieval.

**Request:**
```json
{
  "documentId": "uuid",
  "message": "Your question",
  "conversationHistory": [],
  "pageNumber": 7
}
```

**Response:**
```json
{
  "reply": "AI response with context"
}
```

### GET `/api/documents/:documentId/status`
Check document processing status.

**Response:**
```json
{
  "status": "processing|completed|failed",
  "progress": 75,
  "estimatedTimeRemaining": "2 minutes"
}
```

## 🧠 How It Works

### Document Processing Pipeline

1. **Upload** → PDF stored in Blob Storage
2. **Splitting** → PDF split into 2-page chunks (Azure limitation)
3. **Analysis** → Each chunk processed with Document Intelligence (prebuilt-layout model)
4. **Extraction** → Text, tables, and figures extracted
5. **Graph Detection** → Fallback detection for unlabeled graphs (single letters, equations, headers)
6. **Graph Enrichment** → Template-based classification (keywords) + optional LLM inference
7. **Chunking** → Text split into 1000-char chunks (150 overlap) with separate chunks per graph
8. **Storage** → Chunks stored in Cosmos DB with metadata (pageNumber, sectionTitle, etc.)

### Chat Pipeline

1. **User Query** → Auto-detect page mentions (e.g., "on page 7")
2. **Page Filtering** → Filter chunks to ±1 page window
3. **Graph Detection** → Identify if query is about graphs/figures
4. **Semantic Search** → TF-IDF ranking with +10.0 boost for graph chunks
5. **Context Building** → Select top 3-5 chunks (prioritize graphs if relevant)
6. **LLM Call** → Groq API with context + prompt
7. **Formatting** → HTML-enhanced response with bold headers, bullets, spacing
8. **Rendering** → Display with line breaks and styled formatting

### Graph Template System

**Pre-defined templates** for 22 common academic graphs:

**Economics:**
- Labor Market Monopsony (2 upward curves + 1 downward)
- Supply & Demand
- Cost Curves (MC, ATC, AVC)
- Production Possibilities Frontier
- Aggregate Supply/Demand

**Calculus:**
- Derivatives (slope/tangent lines)
- Integrals (area under curve)
- Critical Points (maxima, minima)
- Concavity (inflection points)

**Biology:**
- Population Growth (exponential vs logistic)
- Enzyme Kinetics (Michaelis-Menten)
- Cell Cycle
- Photosynthesis (light intensity)
- Ecological Pyramids

**Chemistry:**
- Titration Curves (pH vs volume)
- Reaction Rates
- Phase Diagrams
- Chemical Equilibrium

**Physics:**
- Position-Time Graphs
- Velocity-Time Graphs
- Force Diagrams
- Energy Conservation

**Classification:** Keyword-based scoring (threshold ≥ 2 keywords = template match)

## 🎨 UI/UX Features

- **Dark theme** with gradient accents
- **Progress bar** with percentage + time estimate
- **Chat interface** with HTML formatting:
  - Bold section headers (`<strong>` tags)
  - Bullet points with proper spacing
  - Line breaks for readability
  - 1.7 line height, 15px font for accessibility
- **Responsive design** - Collapses to single column on mobile
- **PDF preview** - Embedded viewer in study session

## 🔧 Technical Stack

**Backend:**
- Express.js
- Multer (file upload)
- pdf-lib (PDF manipulation)
- Groq SDK (LLM inference)
- Azure SDKs (Document Intelligence, Blob Storage, Cosmos DB)
- Node.js with ES modules

**Frontend:**
- React 18
- Vite (build tool)
- React Router
- CSS Grid/Flexbox

**Cloud Services:**
- Azure Document Intelligence (OCR + extraction)
- Azure Blob Storage (file storage)
- Azure Cosmos DB (vector store + metadata)
- Groq API (LLM backend)

## 📊 Data Model

**Cosmos DB Document:**
```javascript
{
  id: "uuid",
  documentId: "uuid",
  studentId: "string",
  courseId: "string",
  pageNumber: number,
  sectionTitle: "string",
  content: "string (1000 chars, 150 overlap)",
  // Optional fields for graphs:
  // - hasInterpretation: boolean
  // - graphType: "labor-market-monopsony" etc
  // - template: { axes, curves, insight }
}
```

## 🐛 Known Limitations

- Azure Document Intelligence sync mode only processes first 2 pages → PDF splitting workaround implemented
- Azure doesn't detect figures → Fallback detection via context clues
- Graphs without labels → Template-based classification (keyword matching)
- Context window limited to 6000 chars → Top K selection prioritizes graph chunks

## 🚦 Current Status

✅ **Complete:**
- Document upload & processing
- PDF splitting with absolute page numbering
- Semantic search (TF-IDF + graph boost)
- Graph interpretation (template + LLM)
- Chat interface with page context
- Response formatting (HTML tags + spacing)
- Template library (22 common graphs)
- Keyword-based graph classification

⏳ **Future Enhancements:**
- RAG with embeddings (vector search)
- Multi-turn conversation memory
- Flashcard generation
- Quiz generation
- Study techniques guide
- User authentication
- Frontend page number integration

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional graph templates
- Improved classification algorithm (weighted keywords)
- Enhanced visual formatting
- Mobile app
- Advanced study features