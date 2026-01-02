import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob'
import { AzureKeyCredential, DocumentAnalysisClient } from '@azure/ai-form-recognizer'
import { CosmosClient } from '@azure/cosmos'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { chunkText } from './chunkText.js'

const app = express()
app.use(cors())
app.use(express.json())

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

// Environment
const {
  PORT = 4000,
  AZURE_FORM_RECOGNIZER_ENDPOINT,
  AZURE_FORM_RECOGNIZER_KEY,
  AZURE_STORAGE_CONNECTION_STRING,
  BLOB_UPLOADS_CONTAINER = 'uploads',
  BLOB_JSON_CONTAINER = 'parsed-json',
  COSMOS_ENDPOINT,
  COSMOS_KEY,
  COSMOS_DB_NAME,
  COSMOS_CONTAINER_NAME,
  GOOGLE_API_KEY,
  GEMINI_MODEL = 'gemini-2.0-flash-exp',
} = process.env

if (!AZURE_FORM_RECOGNIZER_ENDPOINT || !AZURE_FORM_RECOGNIZER_KEY) {
  throw new Error('Missing Document Intelligence endpoint/key env vars')
}
if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('Missing AZURE_STORAGE_CONNECTION_STRING env var')
}
if (!COSMOS_ENDPOINT || !COSMOS_KEY || !COSMOS_DB_NAME || !COSMOS_CONTAINER_NAME) {
  throw new Error('Missing Cosmos DB env vars')
}
if (!GOOGLE_API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY env var')
}

// Initialize clients and containers
let uploadsContainer, jsonContainer, docClient, cosmosContainer, genAI
let blobCredential, accountName

async function initializeServices() {
  try {
    // Storage clients
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)
    const parsed = parseAccountInfo(AZURE_STORAGE_CONNECTION_STRING)
    accountName = parsed.accountName
    const accountKey = parsed.accountKey
    blobCredential = new StorageSharedKeyCredential(accountName, accountKey)
    uploadsContainer = blobServiceClient.getContainerClient(BLOB_UPLOADS_CONTAINER)
    jsonContainer = blobServiceClient.getContainerClient(BLOB_JSON_CONTAINER)
    await uploadsContainer.createIfNotExists()
    await jsonContainer.createIfNotExists()
    console.log('✓ Blob storage initialized')

    docClient = new DocumentAnalysisClient(
      AZURE_FORM_RECOGNIZER_ENDPOINT,
      new AzureKeyCredential(AZURE_FORM_RECOGNIZER_KEY),
    )
    console.log('✓ Document Analysis client initialized')

    const cosmosClient = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY })
    cosmosContainer = cosmosClient.database(COSMOS_DB_NAME).container(COSMOS_CONTAINER_NAME)
    console.log('✓ Cosmos DB initialized')

    genAI = new GoogleGenerativeAI(GOOGLE_API_KEY)
    console.log('✓ Gemini API initialized')
  } catch (error) {
    console.error('Failed to initialize services:', error.message)
    throw error
  }
}

const startup = initializeServices().then(() => {
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`)
  })
}).catch((error) => {
  console.error('Failed to start server:', error.message)
  process.exit(1)
})

app.post('/api/documents', upload.single('file'), async (req, res) => {
  try {
    const { studentId, courseId } = req.body
    const file = req.file

    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'studentId and courseId are required' })
    }

    if (!file) {
      return res.status(400).json({ error: 'File is required (field name: file)' })
    }

    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are supported' })
    }

    const documentId = uuidv4()
    const blobName = `${documentId}-${file.originalname}`

    // Upload the PDF to blob storage
    const uploadClient = uploadsContainer.getBlockBlobClient(blobName)
    await uploadClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    })

    // Generate a short-lived SAS URL for Document Intelligence
    const sasUrl = buildBlobSasUrl({
      containerName: BLOB_UPLOADS_CONTAINER,
      blobName,
      blobCredential,
      accountName,
      expiresInMinutes: 15,
    })

    // Analyze with prebuilt-layout
    const poller = await docClient.beginAnalyzeDocument('prebuilt-layout', sasUrl)
    const result = await poller.pollUntilDone()
    const layoutJson = JSON.parse(JSON.stringify(result))

    // Save parsed JSON to blob
    const jsonBlobName = `${documentId}.json`
    const jsonClient = jsonContainer.getBlockBlobClient(jsonBlobName)
    await jsonClient.uploadData(Buffer.from(JSON.stringify(layoutJson, null, 2)), {
      blobHTTPHeaders: { blobContentType: 'application/json' },
    })

    // Chunk text and write to Cosmos DB
    const pageTexts = extractPageTexts(result)
    const chunkDocs = buildChunkDocs({
      pageTexts,
      documentId,
      studentId,
      courseId,
      chunkSize: 1500,
      overlap: 200,
    })

    await cosmosContainer.items.bulk(
      chunkDocs.map((doc) => ({ operationType: 'Create', resourceBody: doc })),
    )

    return res.status(201).json({
      documentId,
      pdfBlob: blobName,
      jsonBlob: jsonBlobName,
      chunksWritten: chunkDocs.length,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'Upload failed', detail: error.message })
  }
})

app.post('/api/chat', express.json(), async (req, res) => {
  try {
    const { documentId, message, conversationHistory = [] } = req.body

    if (!documentId || !message) {
      return res.status(400).json({ error: 'documentId and message are required' })
    }

    // Retrieve all chunks for this document from Cosmos
    const query = {
      query: 'SELECT * FROM c WHERE c.documentId = @documentId ORDER BY c.pageNumber',
      parameters: [{ name: '@documentId', value: documentId }],
    }

    const { resources: chunks } = await cosmosContainer.items.query(query).fetchAll()

    if (!chunks || chunks.length === 0) {
      return res.status(404).json({ error: 'No document chunks found for this documentId' })
    }

    // Build context from chunks
    const documentContext = chunks
      .map((chunk) => `[Page ${chunk.pageNumber}]\n${chunk.content}`)
      .join('\n\n')

    // Build conversation history for Gemini
    const history = conversationHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }))

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

    const systemInstruction = `You are a helpful study assistant. Answer questions based ONLY on the following document content. If the answer is not in the document, say so.\n\nDocument Content:\n${documentContext}`

    const chat = model.startChat({
      history,
      systemInstruction,
    })

    const result = await chat.sendMessage(message)
    const reply = result.response.text()

    return res.json({ reply })
  } catch (error) {
    console.error('Chat error:', error)
    return res.status(500).json({ error: 'Chat failed', detail: error.message })
  }
})

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

app.get('/', (req, res) => {
  res.json({
    message: 'StudyOwl Backend API',
    endpoints: [
      'POST /api/documents - Upload and process documents',
      'POST /api/chat - Chat with document using Gemini',
      'GET /health - Health check',
    ],
    note: 'Access the frontend at http://localhost:5173 (or wherever Vite is running)',
  })
})

function buildChunkDocs({ pageTexts, documentId, studentId, courseId, chunkSize, overlap }) {
  const docs = []
  for (const page of pageTexts) {
    const chunks = chunkText(page.text, chunkSize, overlap)
    for (const chunk of chunks) {
      docs.push({
        id: chunk.id,
        documentId,
        studentId,
        courseId,
        pageNumber: page.pageNumber,
        sectionTitle: null,
        content: chunk.content,
      })
    }
  }
  return docs
}

function extractPageTexts(result) {
  const content = result.content || ''
  const pages = result.pages || []
  return pages.map((page) => {
    const spans = page.spans || []
    const text = spans.map((span) => content.slice(span.offset, span.offset + span.length)).join('\n')
    return { pageNumber: page.pageNumber, text }
  })
}

function buildBlobSasUrl({ containerName, blobName, blobCredential, accountName, expiresInMinutes }) {
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    },
    blobCredential,
  ).toString()
  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sas}`
}

function parseAccountInfo(connectionString) {
  const accountNameMatch = connectionString.match(/AccountName=([^;]+)/)
  const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/)
  if (!accountNameMatch || !accountKeyMatch) {
    throw new Error('Could not parse storage account name/key from connection string')
  }
  return { accountName: accountNameMatch[1], accountKey: accountKeyMatch[1] }
}

export default app
