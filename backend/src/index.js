import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import Groq from 'groq-sdk'
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob'
import { AzureKeyCredential, DocumentAnalysisClient } from '@azure/ai-form-recognizer'
import { CosmosClient } from '@azure/cosmos'
import { chunkTextGenerator } from './chunkText.js'

const app = express()
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}))
app.use(express.json())

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

// Environment
const {
  PORT = 8888,
  AZURE_FORM_RECOGNIZER_ENDPOINT,
  AZURE_FORM_RECOGNIZER_KEY,
  AZURE_STORAGE_CONNECTION_STRING,
  BLOB_UPLOADS_CONTAINER = 'uploads',
  BLOB_JSON_CONTAINER = 'parsed-json',
  COSMOS_ENDPOINT,
  COSMOS_KEY,
  COSMOS_DB_NAME,
  COSMOS_CONTAINER_NAME,
  GROQ_API_KEY,
  GROQ_MODEL = 'llama-3.1-70b-versatile',
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
if (!GROQ_API_KEY) {
  throw new Error('Missing GROQ_API_KEY env var')
}

// Initialize clients and containers
let uploadsContainer, jsonContainer, docClient, cosmosContainer
let blobCredential, accountName
const groq = new Groq({ apiKey: GROQ_API_KEY })

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

    console.log(`✓ Groq configured: ${GROQ_MODEL}`)
  } catch (error) {
    console.error('Failed to initialize services:', error.message)
    throw error
  }
}

// Start server after initialization
;(async () => {
  try {
    await initializeServices()
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  }
})()

app.post('/api/documents', upload.single('file'), async (req, res) => {
  console.log('📤 Upload request received')
  try {
    const { studentId, courseId } = req.body
    const file = req.file
    console.log('   studentId:', studentId, 'courseId:', courseId)
    console.log('   file:', file?.originalname, file?.mimetype, file?.size)

    if (!studentId || !courseId) {
      console.log('   ❌ Missing studentId or courseId')
      return res.status(400).json({ error: 'studentId and courseId are required' })
    }

    if (!file) {
      console.log('   ❌ No file received')
      return res.status(400).json({ error: 'File is required (field name: file)' })
    }

    if (file.mimetype !== 'application/pdf') {
      console.log('   ❌ Invalid file type')
      return res.status(400).json({ error: 'Only PDF files are supported' })
    }

    const documentId = uuidv4()
    const blobName = `${documentId}-${file.originalname}`
    console.log('   Document ID:', documentId)

    // Upload the PDF to blob storage
    console.log('   Uploading to blob storage...')
    const uploadClient = uploadsContainer.getBlockBlobClient(blobName)
    await uploadClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    })
    console.log('   ✓ Blob uploaded')

    // Generate a short-lived SAS URL for Document Intelligence
    console.log('   Generating SAS URL...')
    const sasUrl = buildBlobSasUrl({
      containerName: BLOB_UPLOADS_CONTAINER,
      blobName,
      blobCredential,
      accountName,
      expiresInMinutes: 15,
    })
    console.log('   ✓ SAS URL generated')

    // Analyze with prebuilt-layout
    console.log('   Starting Document Intelligence analysis...')
    const poller = await docClient.beginAnalyzeDocument('prebuilt-layout', sasUrl)
    let result = await poller.pollUntilDone()

    console.log('   ✓ Analysis complete')
    const layoutJson = JSON.parse(JSON.stringify(result))

    // Save parsed JSON to blob
    console.log('   Saving parsed JSON...')
    const jsonBlobName = `${documentId}.json`
    const jsonClient = jsonContainer.getBlockBlobClient(jsonBlobName)
    await jsonClient.uploadData(Buffer.from(JSON.stringify(layoutJson, null, 2)), {
      blobHTTPHeaders: { blobContentType: 'application/json' },
    })
    console.log('   ✓ JSON saved')

    // Chunk text and write to Cosmos DB in batches
    console.log('   Chunking text...')
    const pageTexts = extractPageTexts(result)
    
    // Clear the large result object from memory
    result = null
    
    let totalChunks = 0
    const BATCH_SIZE = 50
    const MAX_CHUNKS_PER_PAGE = 500 // Safety limit
    
    console.log('   Writing chunks to Cosmos DB in batches...')
    for (const page of pageTexts) {
      const batch = []
      let pageChunkCount = 0
      
      for (const chunk of chunkTextGenerator(page.text, 1000, 150)) {
        // Safety check to prevent infinite loops
        if (pageChunkCount >= MAX_CHUNKS_PER_PAGE) {
          console.log(`      Warning: Reached max chunks limit for page ${page.pageNumber}, stopping chunk generation`)
          break
        }
        
        batch.push({
          id: chunk.id,
          documentId,
          studentId,
          courseId,
          pageNumber: page.pageNumber,
          sectionTitle: null,
          content: chunk.content,
        })
        pageChunkCount++
        
        // Write batch when it reaches the size limit
        if (batch.length >= BATCH_SIZE) {
          await cosmosContainer.items.bulk(
            batch.map((doc) => ({ operationType: 'Create', resourceBody: doc })),
          )
          totalChunks += batch.length
          console.log(`      Wrote ${totalChunks} chunks total (${pageChunkCount} from page ${page.pageNumber})...`)
          batch.length = 0 // Clear the array for next batch
        }
      }
      
      // Write remaining chunks in the batch
      if (batch.length > 0) {
        await cosmosContainer.items.bulk(
          batch.map((doc) => ({ operationType: 'Create', resourceBody: doc })),
        )
        totalChunks += batch.length
        console.log(`      Wrote ${totalChunks} chunks total (final batch from page ${page.pageNumber})...`)
      }
    }
    console.log(`   ✓ Created and wrote ${totalChunks} chunks to Cosmos DB`)

    // Generate a SAS URL for the PDF for the frontend to display
    const pdfSasUrl = buildBlobSasUrl({
      containerName: BLOB_UPLOADS_CONTAINER,
      blobName,
      blobCredential,
      accountName,
      expiresInMinutes: 1440, // 24 hours
    })
    console.log('   ✓ PDF SAS URL generated')
    console.log('   PDF URL:', pdfSasUrl)

    console.log('✅ Upload complete:', documentId)
    return res.status(201).json({
      documentId,
      pdfUrl: pdfSasUrl,
      pdfBlob: blobName,
      jsonBlob: jsonBlobName,
      chunksWritten: totalChunks,
    })
  } catch (error) {
    console.error('❌ Upload error:', error.message)
    console.error('   Stack:', error.stack)
    return res.status(500).json({ error: 'Upload failed', detail: error.message })
  }
})

app.post('/api/chat', express.json(), async (req, res) => {
  try {
    const { documentId, message, conversationHistory = [] } = req.body

    if (!documentId || !message) {
      return res.status(400).json({ error: 'documentId and message are required' })
    }

    // Retrieve chunks for this document from Cosmos
    const query = {
    query: 'SELECT * FROM c WHERE c.documentId = @documentId ORDER BY c.pageNumber',
    parameters: [{ name: '@documentId', value: documentId }],
    };

    const { resources: chunks } = await cosmosContainer.items.query(query).fetchAll();

    if (!chunks || chunks.length === 0) {
    return res.status(404).json({ error: 'No document chunks found for this documentId' });
    }

    // Build context with per-page coverage and keyword relevance
    const documentContext = buildContextSmart(chunks, message, 32000)

    console.log('📤 Chat request received');
    console.log(`   Message: "${message.substring(0, 50)}..."`);
    console.log(`   Context size: ${documentContext.length} chars`);

    const fullPrompt = `You are a study assistant. Use ONLY the context below. If the answer is not clearly in the context, reply "I don't see that in the document."\n\nContext (with page hints):\n${documentContext}\n\nQuestion: ${message}`;

    console.log(`   Total prompt size: ${fullPrompt.length} chars`);

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
      model: GROQ_MODEL,
      temperature: 0.2,
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content || 'No response generated';

   
    console.log(`   ✓ Response generated: "${reply.substring(0, 50)}..."`)

    return res.json({ reply })
  } catch (error) {
    console.error('Chat error:', error.message)
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
      'POST /api/chat - Chat with document using Groq',
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

function buildContextSmart(chunks, message, maxChars = 32000) {
  // Ensure per-page coverage and relevance by keywords
  const keywords = (message || '').toLowerCase().match(/[a-zA-Z]{4,}/g) || []

  const scoreChunk = (c) => {
    const text = (c.content || '').toLowerCase()
    if (!text || keywords.length === 0) return 0
    let score = 0
    for (const kw of keywords) {
      if (text.includes(kw)) score += 1
    }
    return score
  }

  const byPage = new Map()
  for (const c of chunks) {
    const p = c.pageNumber ?? -1
    if (!byPage.has(p)) byPage.set(p, [])
    byPage.get(p).push(c)
  }

  const selected = []
  const pageKeys = Array.from(byPage.keys()).sort((a, b) => a - b)
  for (const p of pageKeys) {
    const list = byPage.get(p) || []
    list.sort((a, b) => scoreChunk(b) - scoreChunk(a) || (b.content || '').length - (a.content || '').length)
    if (list[0]) selected.push(list[0])
  }

  const remainingChunks = chunks
    .filter((c) => !selected.includes(c))
    .map((c) => ({ c, s: scoreChunk(c) }))
    .sort((a, b) => b.s - a.s || (b.c.content || '').length - (a.c.content || '').length)
    .map((x) => x.c)

  const ordered = [...selected, ...remainingChunks]

  const parts = []
  let remaining = maxChars
  for (const c of ordered) {
    const text = c.content || ''
    if (!text) continue
    const block = `[Page ${c.pageNumber ?? '?'}] ${text}`
    const needed = block.length + 2
    if (needed > remaining) continue
    parts.push(block)
    remaining -= needed
    if (remaining <= 0) break
  }

  return parts.join("\n\n")
}

function extractPageTexts(result) {
  const pages = result.pages || [];

  return pages.map((page) => {
    //
    // 1. Extract normal text from lines
    //
    const lineText = (page.lines || [])
      .map((line) => line.content)
      .join("\n");

    //
    // 2. Extract tables (flattened into readable text)
    //
    const tableText = (page.tables || [])
      .map((table, tIndex) => {
        const rows = [];

        table.cells.forEach((cell) => {
          const r = cell.rowIndex;
          const c = cell.columnIndex;
          if (!rows[r]) rows[r] = [];
          rows[r][c] = cell.content;
        });

        const formatted = rows
          .map((row) => row.map((c) => c || "").join(" | "))
          .join("\n");

        return `\n[TABLE ${tIndex + 1}]\n${formatted}\n[END TABLE ${tIndex + 1}]`;
      })
      .join("\n");

    //
    // 3. Extract figure metadata (caption + bounding box)
    //
    const figureText = (page.figures || [])
      .map((fig, fIndex) => {
        const caption = fig.caption || "No caption provided";
        const bounds = JSON.stringify(fig.boundingRegions || []);
        return `\n[FIGURE ${fIndex + 1}]\nCaption: ${caption}\nBounds: ${bounds}\n[END FIGURE ${fIndex + 1}]`;
      })
      .join("\n");

    //
    // 4. Extract graph‑related text (axis labels, numbers, annotations)
    //    This is CRITICAL for Groq to understand graphs.
    //
    const graphText = (page.lines || [])
      .filter((line) => {
        // Keep text that has positional info (axis labels, numbers, etc.)
        return line.polygon || line.boundingRegions;
      })
      .map((line) => `[GRAPH_TEXT] ${line.content}`)
      .join("\n");

    //
    // 5. Combine all elements in reading order
    //
    const fullText = [lineText, tableText, figureText, graphText]
      .filter(Boolean)
      .join("\n");

    return {
      pageNumber: page.pageNumber,
      text: fullText,
    };
  });
}


function buildBlobSasUrl({ containerName, blobName, blobCredential, accountName, expiresInMinutes }) {
  try {
    const sas = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      },
      blobCredential,
    ).toString()
    const url = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sas}`
    console.log('   SAS URL created:', url.substring(0, 100) + '...')
    return url
  } catch (error) {
    console.error('   Error generating SAS URL:', error.message)
    // Fallback to unsigned URL if SAS fails
    return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`
  }
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
