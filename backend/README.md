# 🔧 StudyOwl Backend

Express.js server for document processing, semantic search, and AI-powered chat.

## 📋 What It Does

1. **Accepts PDF uploads** → Processes with Azure Document Intelligence
2. **Splits PDFs** → Handles 2-page limitation via pdf-lib chunking
3. **Extracts content** → Text, tables, figures with fallback detection
4. **Interprets graphs** → Uses template library + keyword classification
5. **Chunks text** → 1000-char chunks with 150-char overlap
6. **Stores in Cosmos DB** → Indexed by pageNumber + sectionTitle
7. **Serves chat API** → Semantic search + Groq LLM responses
8. **Tracks progress** → Real-time upload status polling

## 🚀 Setup

### Install
```bash
npm install
```

### Configure
Create `.env` file with:
```
PORT=8888
GROQ_API_KEY=gsk_***
GROQ_MODEL=llama-3.1-8b-instant
GROQ_GRAPH_MODEL=llama-3.1-70b-versatile
GRAPH_ENRICHMENT_MODE=missing
MAX_CHUNKS_FOR_CHAT=500
AUTH_REQUIRED=true
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
SUPABASE_JWT_ISSUER=https://your-project-ref.supabase.co/auth/v1
AZURE_FORM_RECOGNIZER_ENDPOINT=https://eastus2.api.cognitive.microsoft.com/
AZURE_FORM_RECOGNIZER_KEY=***
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=***
AZURE_COSMOSDB_CONNECTION_STRING=AccountEndpoint=***
```

### Run
```bash
npm start
```

Server starts on `http://localhost:8888`

## 📁 File Structure

```
backend/
├── src/
│   ├── index.js        # Main server + all endpoints (1374 lines)
│   └── chunkText.js    # Text chunking generator
├── .env                # Environment variables (git-ignored)
├── package.json
└── README.md
```

## 🔌 API Endpoints

### POST `/api/documents`
Upload and process a document.

**Form Data:**
- `file` (multipart) - PDF file
- `studentId` (string) - Student identifier
- `courseId` (string) - Course identifier

**Response:**
```json
{
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Document uploaded successfully"
}
```

**Processing:**
1. File saved to Blob Storage
2. PDF split into 2-page chunks
3. Each chunk analyzed with Document Intelligence
4. Text extracted + fallback graph detection
5. Graphs interpreted with template/LLM
6. Text chunked and stored in Cosmos DB
7. Progress tracked in-memory map

---

### POST `/api/chat`
Chat about a document with semantic context.

**Request:**
```json
{
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "explain the labor market monopsony graph",
  "conversationHistory": [],
  "pageNumber": 7
}
```

**Optional:**
- `pageNumber` - Manually specify page context (int)
- Auto-detection from message (e.g., "on page 7") also works

**Response:**
```json
{
  "reply": "<strong>Labor Market Monopsony:</strong>\n\n• <strong>Curve 1: Labor Supply</strong>...",
  "context": "[Page 7] ..."
}
```

**Processing:**
1. Extract page hint from message or parameter
2. Filter chunks to ±1 page window
3. Detect if query is about graphs (regex)
4. Perform TF-IDF semantic search
5. Prioritize graph chunks if query is about graphs
6. Build context (top 3-5 chunks, max 6000 chars)
7. Call Groq with formatted prompt
8. Format response with HTML + newlines

---

### GET `/api/documents/:documentId/status`
Check document processing status.

**Response:**
```json
{
  "status": "processing",
  "progress": 75,
  "estimatedTimeRemaining": "2 minutes"
}
```

**Status Values:**
- `processing` - Currently being processed
- `completed` - Ready to chat
- `failed` - Error during processing

## 🧠 Core Functions

### Document Processing

**`extractPageTexts(result)`**
- Extracts text, tables, figures from Document Intelligence
- Falls back to keyword detection if no figures found
- Returns `{ pageNumber, text, figureMetadata }`

**`enrichGraphDescriptions(pageTexts)`**
- Loops through figures
- Calls `scaffoldGraphPrompt()` for each
- Adds `[GRAPH STRUCTURE]` markers
- Logs classification results

**`scaffoldGraphPrompt(graphMetadata, surroundingText)`**
- Classifies graph with `classifyGraphType()`
- If matchScore ≥ 2: uses template-based scaffolding
- Otherwise: falls back to LLM inference
- Returns formatted structure with axes, curves, insights

**`classifyGraphType(surroundingText, visibleElements)`**
- Keyword-based matching against template library
- Returns: `{ domain, templateName, template, matchScore }`
- Score: count of keywords found

### Chat

**`buildContextSmart(chunks, message, maxChars, pageHint)`**
- Detects graph queries via regex
- Filters chunks by page hint (±1 window)
- Calculates TF-IDF scores
- Boosts graph chunks by +10.0
- Selects top K chunks (3-5)
- Returns formatted context string

**`formatResponse(text)`**
- Converts bullets to `•` format with spacing
- Converts `**bold**` to `<strong>` tags
- Auto-bolds section headers (Graph Type:, Axes:, etc.)
- Ensures proper newlines
- Returns HTML-enhanced text

## 📊 Graph Templates

22 pre-defined templates in `GRAPH_TEMPLATES`:

```javascript
{
  economics: {
    'labor-market-monopsony': {
      keywords: ['monopsony', 'labor market', 'single firm', ...],
      axes: { x: 'Quantity of Labor (L)', y: 'Wage Rate (W)' },
      curves: [
        { name: 'Labor Supply', slope: 'upward', meaning: '...' },
        { name: 'Marginal Cost of Labor (MCL)', slope: 'upward (steeper)', meaning: '...' },
        { name: 'Labor Demand / Marginal Revenue Product (MRP)', slope: 'downward', meaning: '...' }
      ],
      insight: 'Monopsonist hires where MCL = MRP...'
    },
    // ... more templates
  },
  calculus: { /* ... */ },
  biology: { /* ... */ },
  chemistry: { /* ... */ },
  physics: { /* ... */ }
}
```

## 🔍 Semantic Search Algorithm

1. **TF-IDF Scoring** - Calculate term frequency for each chunk
2. **Graph Boost** - Add +10.0 to graph chunk scores
3. **Page Filtering** - Keep only chunks within ±1 page of hint
4. **Top-K Selection** - Select 3-5 highest-scoring chunks
5. **Context Limit** - Trim to 6000 characters
6. **Formatting** - Add `[Page X]` prefixes

## 📦 Dependencies

- `express` - Web framework
- `multer` - File upload handling
- `pdf-lib` - PDF manipulation
- `groq-sdk` - LLM API
- `@azure/ai-form-recognizer` - Document Intelligence
- `@azure/storage-blob` - Blob Storage
- `@azure/cosmos` - Cosmos DB
- `dotenv` - Environment variables
- `uuid` - ID generation

## 🐛 Debugging

**Enable console logging:**
- Upload progress: Shows page counts, chunk creation
- Chat processing: Shows page hint, chunk counts, context preview
- Graph enrichment: Shows classification results, template matches

**Example log output:**
```
Page 7: 2450 chars, 1 figures
Classified as: economics/labor-market-monopsony (score: 4)
Figure 1: Added dedicated chunk (len=450, hasInterpretation=true)
TF-IDF search found 3 relevant chunks
Context: 3200 chars, includes 1 graph chunk
```

## 🚦 Error Handling

- **Upload errors** → Returns error message, logs details
- **Azure API timeouts** → Falls back to text extraction only
- **Groq API errors** → Returns error message to client
- **Cosmos DB errors** → Logged, request fails gracefully

## 📝 Notes

- **PDF Splitting:** Required because Azure Document Intelligence sync mode only processes first 2 pages
- **Graph Fallback:** Azure doesn't detect figures → detects via context clues (single letters, equations, headers)
- **Page Numbers:** Normalized to absolute positions to prevent 1,2,1,2 issue
- **Separate Graph Chunks:** Each figure gets own chunk (not combined per page)
- **Page Context:** Auto-detect "page X" from message or use pageNumber parameter

## 🔮 Future Enhancements

- Vector embeddings for semantic search
- Streaming responses
- Batch document processing
- Webhook notifications
- Rate limiting
- Request authentication
- Better error messages
