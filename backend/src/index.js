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
import { PDFDocument } from 'pdf-lib'

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

// In-memory progress tracking
const uploadProgress = new Map() // documentId -> { stage, progress, startTime, estimatedTotal }

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

    // Initialize progress tracking
    uploadProgress.set(documentId, {
      stage: 'uploading',
      progress: 0,
      startTime: Date.now(),
      message: 'Starting upload...',
    })

    // Upload the PDF to blob storage
    console.log('   Uploading to blob storage...')
    const uploadClient = uploadsContainer.getBlockBlobClient(blobName)
    await uploadClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    })
    
    // Verify upload completed successfully
    const props = await uploadClient.getProperties()
    console.log(`   ✓ Blob uploaded and verified: ${props.contentLength} bytes`)

    // Update progress: analyzing (0-40% reserved for analysis)
    uploadProgress.set(documentId, {
      stage: 'analyzing',
      progress: 0,
      startTime: uploadProgress.get(documentId).startTime,
      message: 'Running Document Intelligence analysis...',
    })
    
    // WORKAROUND for eastus2 legacy endpoint: split PDF and process in batches
    console.log('   Endpoint is eastus2 (legacy) - using PDF split workaround...')
    const pdfDoc = await PDFDocument.load(file.buffer)
    const totalPages = pdfDoc.getPageCount()
    console.log(`   Total pages in PDF: ${totalPages}`)
    
    let allPages = []
    const PAGES_PER_CHUNK = 2 // Process 2 pages at a time
    
    for (let i = 0; i < totalPages; i += PAGES_PER_CHUNK) {
      const endPage = Math.min(i + PAGES_PER_CHUNK, totalPages)
      const pagesProcessed = endPage
      const progressPercent = (pagesProcessed / totalPages) * 100
      
      console.log(`   Processing pages ${i + 1}-${endPage}...`)
      
      // Create a sub-PDF with this batch of pages
      const subPdf = await PDFDocument.create()
      for (let pageIdx = i; pageIdx < endPage; pageIdx++) {
        const [copiedPage] = await subPdf.copyPages(pdfDoc, [pageIdx])
        subPdf.addPage(copiedPage)
      }
      const subPdfBytes = await subPdf.save()
      
      // Process this chunk
      const poller = await docClient.beginAnalyzeDocument(
        'prebuilt-layout',
        subPdfBytes,
        {
          contentType: 'application/pdf',
          locale: 'en-US',
        }
      )
      const chunkResult = await poller.pollUntilDone()
      console.log(`      Got ${chunkResult.pages?.length || 0} pages from this chunk`)
      
      if (chunkResult.pages) {
        // Normalize page numbers to absolute positions in the original PDF
        chunkResult.pages.forEach((p, idx) => {
          const absolutePageNumber = i + idx + 1 // i is zero-based start index
          allPages.push({ ...p, pageNumber: absolutePageNumber })
        })
      }
      
      // Update progress: 0-40% for analysis phase
      const analysisProgress = Math.round(progressPercent * 0.4)
      uploadProgress.set(documentId, {
        stage: 'analyzing',
        progress: analysisProgress,
        startTime: uploadProgress.get(documentId).startTime,
        message: `Analyzed ${pagesProcessed}/${totalPages} pages`,
      })
    }
    
    console.log(`   ✓ Analysis complete - total pages collected: ${allPages.length}`)
    
    // Create result object with all pages
    let result = { pages: allPages }
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
    let pageTexts = extractPageTexts(result)
    console.log(`   Extracted ${pageTexts.length} pages from document`)
    pageTexts.forEach(p => {
      console.log(`      Page ${p.pageNumber}: ${p.text.length} chars, ${p.figureMetadata?.length || 0} figures`)
      if (p.figureMetadata && p.figureMetadata.length > 0) {
        p.figureMetadata.forEach((fig, idx) => {
          console.log(`         Figure ${idx + 1}: "${fig.caption.substring(0, 50)}..." - Missing: ${fig.missingElements}`)
        })
      }
    })
    
    // Enrich graphs with AI-inferred context
    pageTexts = await enrichGraphDescriptions(pageTexts)
    
    // Update progress: chunking
    uploadProgress.set(documentId, {
      stage: 'chunking',
      progress: 40,
      startTime: uploadProgress.get(documentId).startTime,
      message: 'Chunking text and preparing for storage...',
    })
    
    // Clear the large result object from memory
    result = null
    
    let totalChunks = 0
    const BATCH_SIZE = 50
    const MAX_CHUNKS_PER_PAGE = 500 // Safety limit
    
    // Estimate total chunks by sampling first page
    let estimatedTotalChunks = 100
    if (pageTexts.length > 0 && pageTexts[0].text) {
      const sampleChunks = Array.from(chunkTextGenerator(pageTexts[0].text, 1000, 150)).length
      estimatedTotalChunks = Math.max(sampleChunks * pageTexts.length, 10)
    }
    
    console.log('   Writing chunks to Cosmos DB in batches...')
    for (const page of pageTexts) {
      console.log(`   Processing page ${page.pageNumber} (${page.text?.length || 0} chars)...`)
      console.log(`      Page text preview: "${(page.text || '').substring(0, 200)}${(page.text || '').length > 200 ? '...' : ''}"`)
      
      if (!page.text || page.text.trim().length === 0) {
        console.log(`      Skipping page ${page.pageNumber} - no text content`)
        continue
      }
      
      const batch = []
      let pageChunkCount = 0

      // Add a SEPARATE dedicated chunk for EACH figure on the page
      const figureBlocks = Array.from((page.text || '').matchAll(/\[FIGURE[\s\S]*?\[END FIGURE \d+\]/gi)).map(m => m[0])
      if (figureBlocks.length > 0) {
        console.log(`      📊 Found ${figureBlocks.length} figure(s) on page ${page.pageNumber}`)
        
        for (let figIdx = 0; figIdx < figureBlocks.length; figIdx++) {
          const graphChunkContent = figureBlocks[figIdx]
          const hasInterpretation = /\[GRAPH (STRUCTURE|INTERPRETATION)\]/i.test(graphChunkContent)
          
          batch.push({
            id: uuidv4(),
            documentId,
            studentId,
            courseId,
            pageNumber: page.pageNumber,
            sectionTitle: `Graph ${figIdx + 1}`,
            content: graphChunkContent,
          })
          pageChunkCount++
          console.log(`         Figure ${figIdx + 1}: Added dedicated chunk (len=${graphChunkContent.length}, hasInterpretation=${hasInterpretation})`)
          
          if (hasInterpretation) {
            const interpretMatch = graphChunkContent.match(/\[GRAPH (STRUCTURE|INTERPRETATION)\][:\s]*([^\[]{0,150})/i)
            if (interpretMatch) {
              console.log(`            Preview: "${interpretMatch[2].trim()}..."`)
            }
          }

          if (batch.length >= BATCH_SIZE) {
            await cosmosContainer.items.bulk(
              batch.map((doc) => ({ operationType: 'Create', resourceBody: doc })),
            )
            totalChunks += batch.length
            console.log(`      Wrote ${totalChunks} chunks total (${pageChunkCount} from page ${page.pageNumber})...`)

            const storageProgress = 40 + (55 * (totalChunks / Math.max(estimatedTotalChunks, 10)))
            uploadProgress.set(documentId, {
              stage: 'storing',
              progress: Math.min(Math.round(storageProgress), 95),
              startTime: uploadProgress.get(documentId).startTime,
              message: `Storing ${totalChunks} chunks in database...`,
            })

            batch.length = 0
          }
        }
      }
      
      for (const chunk of chunkTextGenerator(page.text, 1000, 150)) {
        // Safety check to prevent infinite loops
        if (pageChunkCount >= MAX_CHUNKS_PER_PAGE) {
          console.log(`      Warning: Reached max chunks limit for page ${page.pageNumber}, stopping chunk generation`)
          break
        }
        
        // Log if this chunk contains graph interpretation
        const hasGraphInterpretation = /\[graph (structure|interpretation)\]|\[figure \d+\]/i.test(chunk.content)
        if (hasGraphInterpretation) {
          console.log(`      📊 Graph chunk found on page ${page.pageNumber}: ${chunk.content.substring(0, 100)}...`)
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
          
          // Update progress: 40-95% for storage phase based on chunks written
          const storageProgress = 40 + (55 * (totalChunks / Math.max(estimatedTotalChunks, 10)))
          uploadProgress.set(documentId, {
            stage: 'storing',
            progress: Math.min(Math.round(storageProgress), 95),
            startTime: uploadProgress.get(documentId).startTime,
            message: `Storing ${totalChunks} chunks in database...`,
          })
          
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
        
        // Final progress update
        const storageProgress = 40 + (55 * (totalChunks / Math.max(estimatedTotalChunks, 10)))
        uploadProgress.set(documentId, {
          stage: 'storing',
          progress: Math.min(Math.round(storageProgress), 95),
          startTime: uploadProgress.get(documentId).startTime,
          message: `Storing ${totalChunks} chunks in database...`,
        })
      }
      console.log(`   ✓ Page ${page.pageNumber} complete: ${pageChunkCount} chunks written`)
    }
    console.log(`   ✓ Created and wrote ${totalChunks} chunks to Cosmos DB across ${pageTexts.length} pages`)

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
    
    // Mark as complete and clean up after 10 seconds
    uploadProgress.set(documentId, {
      stage: 'complete',
      progress: 100,
      startTime: uploadProgress.get(documentId).startTime,
      message: 'Ready for study session!',
    })
    setTimeout(() => uploadProgress.delete(documentId), 10000)
    
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
    const { documentId, message, pageNumber, conversationHistory = [] } = req.body

    if (!documentId || !message) {
      return res.status(400).json({ error: 'documentId and message are required' })
    }

    // Retrieve chunks for this document from Cosmos
    const query = {
    query: 'SELECT * FROM c WHERE c.documentId = @documentId ORDER BY c.pageNumber',
    parameters: [{ name: '@documentId', value: documentId }],
    };

    const { resources: allChunks } = await cosmosContainer.items.query(query).fetchAll();

    if (!allChunks || allChunks.length === 0) {
    return res.status(404).json({ error: 'No document chunks found for this documentId' });
    }

    console.log('📤 Chat request received');
    console.log(`   Message: "${message}"`);
    if (pageNumber) {
      console.log(`   Client page hint: ${pageNumber}`)
    }

    // Auto-detect page reference in message (e.g., "page 7")
    let pageHint = pageNumber
    const pageMatch = message.match(/page\s+(\d{1,3})/i)
    if (!pageHint && pageMatch) {
      pageHint = parseInt(pageMatch[1], 10)
      if (!Number.isNaN(pageHint)) {
        console.log(`   Auto-detected page hint from message: ${pageHint}`)
      }
    }

    // Narrow chunks to hinted page (with +/-1 window) if provided
    let candidateChunks = allChunks
    if (pageHint && Number.isFinite(pageHint)) {
      const windowPages = [pageHint - 1, pageHint, pageHint + 1].filter(p => p >= 1)
      candidateChunks = allChunks.filter(c => windowPages.includes(c.pageNumber))
      console.log(`   📄 Page hint active. Window: ${windowPages.join(', ')} -> ${candidateChunks.length} chunks`)
      if (candidateChunks.length === 0) {
        console.log('   ⚠️ No chunks in hinted window; falling back to all pages')
        candidateChunks = allChunks
      }
    }
    
    // Check if this is a graph-related query
    const isGraphQuery = /figure|graph|chart|diagram|plot|curve|illustration|image|visual/i.test(message)
    console.log(`   🔍 Graph Query Detection: ${isGraphQuery}`)

    console.log(`   📚 Retrieved ${allChunks.length} total chunks from Cosmos`);
    console.log(`   📚 Using ${candidateChunks.length} candidate chunks after page filter`);
    
    // Log how many chunks contain graph interpretations (check multiple patterns)
    const graphChunksInDb = candidateChunks.filter(c => {
      const content = c.content || ''
      return /\[graph (structure|interpretation)\]/i.test(content) || 
             /\[figure \d+\]/i.test(content) ||
             /\[end figure \d+\]/i.test(content)
    })
    console.log(`   📊 Found ${graphChunksInDb.length} chunks with graph/figure markers in database`)
    
    // Also check for page 7 specifically (where the monopsony graph is)
    const page7Chunks = candidateChunks.filter(c => c.pageNumber === 7)
    if (page7Chunks.length > 0) {
      console.log(`   📄 (Debug) Found ${page7Chunks.length} chunks from page 7 in candidate set`)
    }

    // Build context with AGGRESSIVE relevance filtering
    const documentContext = buildContextSmart(candidateChunks, message, 6000, pageHint)

    console.log(`   Context size: ${documentContext.length} chars (max 6000)`);
    console.log(`   Prompt will be ~${documentContext.length + message.length + 300} chars total`);
    
    // Log a preview of the context being sent
    const contextPreview = documentContext.substring(0, 500)
    console.log(`   Context preview (first 500 chars): "${contextPreview}..."`)
    const hasGraphInterpInContext = /\[GRAPH (STRUCTURE|INTERPRETATION)\]/i.test(documentContext)
    console.log(`   Context contains [GRAPH STRUCTURE/INTERPRETATION]: ${hasGraphInterpInContext}`)

    const fullPrompt = `You are a study assistant helping students understand their course materials.

Context from document:
${documentContext}

Student question: ${message}

Instructions:
- Answer based on the context provided above
- For questions about graphs/figures, refer to the [GRAPH STRUCTURE] sections which describe axes, curves, and visual elements
- Be specific and detailed when explaining graph components
- If the context doesn't contain enough information to answer confidently, say "I need more context from the document to answer that specifically"`;

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

    // Format response for better readability
    const formattedReply = formatResponse(reply)

    console.log(`   ✓ Response generated: "${formattedReply.substring(0, 50)}..."`)

    return res.json({ reply: formattedReply })
  } catch (error) {
    console.error('Chat error:', error.message)
    return res.status(500).json({ error: 'Chat failed', detail: error.message })
  }
})

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

app.get('/api/documents/:documentId/status', (req, res) => {
  const { documentId } = req.params
  const progress = uploadProgress.get(documentId)
  
  if (!progress) {
    return res.status(404).json({ error: 'Document not found or already completed' })
  }
  
  const elapsedMs = Date.now() - progress.startTime
  const elapsedSec = elapsedMs / 1000
  
  // Estimate remaining time based on current progress
  let estimatedRemainingSec = 0
  if (progress.progress > 0 && progress.progress < 100) {
    const ratePerSec = progress.progress / elapsedSec
    estimatedRemainingSec = (100 - progress.progress) / ratePerSec
  }
  
  return res.json({
    documentId,
    stage: progress.stage,
    progress: progress.progress,
    elapsedSeconds: Math.round(elapsedSec),
    estimatedRemainingSeconds: Math.round(estimatedRemainingSec),
    message: progress.message || '',
  })
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

function buildContextSmart(chunks, message, maxChars = 6000, pageHint = null) {
  console.log(`\n🔍 [buildContextSmart] Called with:`)
  console.log(`   Query: "${message}"`)
  console.log(`   Total chunks: ${chunks.length}`)
  if (pageHint) {
    console.log(`   Page hint: ${pageHint} (will prioritize graph chunks from this page)`)
  }
  
  // Extract keywords from message
  const keywords = (message || '').toLowerCase().match(/[a-zA-Z]{4,}/g) || []
  
  // Check if query mentions graphs/figures
  const isGraphQuery = /figure|graph|chart|diagram|plot|curve|illustration|image|visual/i.test(message)
  console.log(`   Is Graph Query: ${isGraphQuery}`)

  if (keywords.length === 0) {
    return getPagesRepresentation(chunks, [])
  }

  // If this is a graph query, FORCE inclusion of graph chunks (prioritize hinted page)
  let graphChunks = []
  if (isGraphQuery) {
    graphChunks = chunks.filter(c => 
      /\[graph (structure|interpretation)\]|\[figure \d+\]/i.test(c.content || '')
    )
    
    // If page hint provided, prioritize graph chunks from that page
    if (pageHint && graphChunks.length > 0) {
      const hintedGraphs = graphChunks.filter(c => c.pageNumber === pageHint)
      const otherGraphs = graphChunks.filter(c => c.pageNumber !== pageHint)
      graphChunks = [...hintedGraphs, ...otherGraphs]
      console.log(`   [Graph Query] Found ${graphChunks.length} graph chunks (${hintedGraphs.length} from page ${pageHint})`)
    } else {
      console.log(`   [Graph Query] Found ${graphChunks.length} graph-containing chunks`)
    }
    
    if (graphChunks.length > 0) {
      console.log(`   Sample from top chunk (page ${graphChunks[0].pageNumber}): "${graphChunks[0].content.substring(0, 200)}..."`)
    }
  }

  // Calculate TF-IDF scores for semantic relevance
  const scoredChunks = chunks.map((chunk) => {
    const text = (chunk.content || '').toLowerCase()
    let tfidfScore = 0
    
    // Massive boost for graph chunks when graphs are mentioned
    if (isGraphQuery && /\[graph (structure|interpretation)\]|\[figure \d+\]/i.test(text)) {
      tfidfScore += 10.0 // Very high boost to ensure graph chunks are selected
    }

    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'g')
      const matches = (text.match(regex) || []).length
      const wordCount = text.split(/\s+/).length || 1
      const tf = matches / wordCount

      const chunksWithTerm = chunks.filter((c) =>
        new RegExp(`\\b${kw}\\b`, 'i').test(c.content || ''),
      ).length
      const idf = Math.log((chunks.length + 1) / (chunksWithTerm + 1))

      tfidfScore += tf * idf
    }

    return { chunk, score: tfidfScore }
  })

  // For graph queries: prioritize top graph chunks by relevance, not all
  let topChunks
  if (isGraphQuery && graphChunks.length > 0) {
    const graphScored = scoredChunks
      .filter(x => graphChunks.includes(x.chunk))
      .sort((a, b) => b.score - a.score)
    const TOP_GRAPH = 5
    const topGraphChunks = graphScored.slice(0, TOP_GRAPH).map(x => x.chunk)

    const nonGraphChunks = scoredChunks
      .filter(x => !graphChunks.includes(x.chunk))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.chunk)
    
    topChunks = [...topGraphChunks, ...nonGraphChunks]
    console.log(`   [Graph Query] Using top ${topGraphChunks.length}/${graphChunks.length} graph chunks + ${nonGraphChunks.length} context chunks`)
  } else {
    // Regular semantic search
    const K = 3
    topChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, K)
      .filter((x) => x.score > 0)
      .map((x) => x.chunk)
  }

  console.log(
    `   [Semantic Search] Selected ${topChunks.length} chunks (from ${chunks.length} total)${isGraphQuery ? ' [GRAPH QUERY]' : ''}`,
  )

  if (topChunks.length > 0) {
    const parts = []
    let remaining = maxChars
    for (const c of topChunks) {
      const text = c.content || ''
      if (!text) continue
      const block = `[Page ${c.pageNumber ?? '?'}] ${text}`
      const needed = block.length + 2
      if (needed > remaining) {
        console.log(`   [Warning] Chunk from page ${c.pageNumber} would exceed ${maxChars} char limit, truncating context`)
        break
      }
      parts.push(block)
      remaining -= needed
    }
    console.log(`   [Context] Final: ${parts.join("\n\n").length} chars from ${parts.length} chunks`)
    return parts.join("\n\n")
  }

  console.log(`   [Semantic Search] No matches, falling back to page summary`)
  return getPagesRepresentation(chunks, scoredChunks)
}

function getPagesRepresentation(chunks, scoredChunks) {
  // Fallback: one representative chunk per page for broad coverage
  const byPage = new Map()
  for (const chunk of chunks) {
    const p = chunk.pageNumber ?? -1
    if (!byPage.has(p)) byPage.set(p, [])
    byPage.get(p).push(chunk)
  }

  const selected = []
  const pageKeys = Array.from(byPage.keys()).sort((a, b) => a - b)
  for (const p of pageKeys) {
    const list = byPage.get(p) || []
    const scored = list.map((c) => ({
      c,
      s: scoredChunks.find((x) => x.c === c)?.s || 0,
    }))
    scored.sort((a, b) => b.s - a.s || (b.c.content || '').length - (a.c.content || '').length)
    if (scored[0]) selected.push(scored[0].c)
  }

  return selected
}

function formatResponse(text) {
  if (!text) return text

  // Split into lines first to process each line
  const lines = text.split('\n')
  const processedLines = []
  let inList = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    if (!trimmed) {
      processedLines.push('')
      inList = false
      continue
    }
    
    // Check if this line is a bullet point (numbered, -, *, •)
    const isBullet = /^(\d+\.|\-|\*|•)\s/.test(trimmed)
    
    if (isBullet) {
      // Add spacing before first bullet in a list
      if (!inList && processedLines.length > 0 && processedLines[processedLines.length - 1].trim() !== '') {
        processedLines.push('') // Add blank line before bullet list
      }
      
      // Convert to consistent format with •
      let bulletText = trimmed
        .replace(/^(\d+\.)\s+/, '• ')  // numbered lists
        .replace(/^-\s+/, '• ')         // dash bullets
        .replace(/^\*\s+/, '• ')        // asterisk bullets
      
      processedLines.push(bulletText)
      inList = true
    } else {
      // Check for bold markers (**text**) and convert to <strong>
      let processedLine = trimmed
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      
      // Check for section headers (lines with key terms followed by :)
      const isHeader = /^(Graph Type|Axes|Curves?(\/Lines)?|Key Insight|Curve \d+):/i.test(processedLine)
      if (isHeader) {
        // Wrap headers in strong tags
        processedLine = processedLine.replace(/^([^:]+:)/, '<strong>$1</strong>')
        
        // Add spacing after previous section
        if (processedLines.length > 0 && processedLines[processedLines.length - 1].trim() !== '') {
          processedLines.push('')
        }
      }
      
      processedLines.push(processedLine)
      
      // Add spacing after headers
      if (isHeader) {
        processedLines.push('')
      }
      
      inList = false
    }
  }
  
  // Join and clean up
  let formatted = processedLines.join('\n')
  
  // Clean up excessive newlines (max 2 in a row)
  formatted = formatted.replace(/\n{3,}/g, '\n\n')
  
  return formatted.trim()
}

function extractPageTexts(result) {
  const pages = result.pages || [];

  return pages.map((page) => {
    //
    // 1. Extract normal text from lines
    //
    const allLines = page.lines || []
    const lineText = allLines
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
    // 3. Extract figures with graph analysis metadata
    //
    const figures = page.figures || []
    const figureTextParts = figures.map((fig, fIndex) => {
      const caption = fig.caption || "No caption provided"
      
      // Extract text elements visible in/near the graph
      const graphElements = allLines
        .filter((line) => line.polygon || line.boundingRegions)
        .map((line) => line.content)
      
      // Analyze what graph elements are present
      const hasAxisLabels = graphElements.some(text => 
        /^(x|y|z)[-\s]?axis|horizontal|vertical/i.test(text)
      )
      const hasNumbers = graphElements.some(text => /\d+/.test(text))
      const hasLegend = caption.toLowerCase().includes('legend') || 
                       graphElements.some(text => /legend|key/i.test(text))
      const hasTitle = caption.length > 10 || 
                      graphElements.some(text => text.length > 20)
      
      // Build metadata about completeness
      const missingElements = []
      if (!hasAxisLabels) missingElements.push('axis labels')
      if (!hasLegend) missingElements.push('legend')
      if (!hasTitle && !caption) missingElements.push('title')
      
      const graphMetadata = {
        caption,
        extractedText: graphElements.join(', '),
        missingElements: missingElements.join(', ') || 'none identified',
        needsContextInference: missingElements.length > 0
      }
      
      return {
        text: `\n[FIGURE ${fIndex + 1}]\nCaption: ${caption}\nVisible Elements: ${graphMetadata.extractedText || 'minimal text'}\nMissing: ${graphMetadata.missingElements}\n[END FIGURE ${fIndex + 1}]`,
        metadata: graphMetadata,
        figureIndex: fIndex
      }
    })
    
    // FALLBACK: Detect implied graphs when Azure doesn't detect figures
    // Look for visual graph indicators: single-letter axis labels, equations, section headers
    if (figures.length === 0) {
      const hasGraphIndicators = allLines.some(line => {
        const content = line.content.trim()
        // Single letters often used as axes (W, L, P, Q, etc.)
        const isSingleLetter = /^[A-Z]$/i.test(content)
        // Equations with variable names
        const hasEquation = /^[A-Z]{1,3}\s*=\s*.+/.test(content)
        // Section headers mentioning figures/graphs
        const mentionsFigure = /figure|graph|chart|diagram/i.test(content)
        return isSingleLetter || hasEquation || mentionsFigure
      })
      
      // Check for section headers that suggest a graph follows
      const hasGraphSection = lineText.match(/labor market under monopsony|supply.*demand.*curve|equilibrium/i)
      
      if (hasGraphIndicators || hasGraphSection) {
        // Extract all text elements as potential graph components
        const graphElements = allLines.map(line => line.content.trim()).filter(t => t.length > 0)
        
        const impliedFigure = {
          text: `\n[FIGURE 1]\nCaption: Implied graph detected\nVisible Elements: ${graphElements.slice(0, 10).join(', ')}\nMissing: axis labels, legend, title (graph not explicitly tagged in PDF)\n[END FIGURE 1]`,
          metadata: {
            caption: "Implied graph detected from context",
            extractedText: graphElements.join(', '),
            missingElements: 'axis labels, legend, title',
            needsContextInference: true
          },
          figureIndex: 0
        }
        figureTextParts.push(impliedFigure)
      }
    }
    
    const figureText = figureTextParts.map(f => f.text).join("\n")

    //
    // 4. Combine all elements in reading order
    //
    const fullText = [lineText, tableText, figureText]
      .filter(Boolean)
      .join("\n");

    return {
      pageNumber: page.pageNumber,
      text: fullText,
      figureMetadata: figureTextParts.map(f => f.metadata)
    };
  });
}

// Graph template library for common academic graph types
const GRAPH_TEMPLATES = {
  economics: {
    'labor-market-monopsony': {
      keywords: ['monopsony', 'labor market', 'single firm', 'hires labor', 'fewer people', 'underpaid'],
      axes: { x: 'Quantity of Labor (L)', y: 'Wage Rate (W)' },
      curves: [
        { name: 'Labor Supply', slope: 'upward', meaning: 'Shows the wage rate workers require at each quantity of labor' },
        { name: 'Marginal Cost of Labor (MCL)', slope: 'upward (steeper)', meaning: 'Cost to hire one additional worker, steeper than supply because monopsonist must raise wages for all workers' },
        { name: 'Labor Demand / Marginal Revenue Product (MRP)', slope: 'downward', meaning: 'Value/revenue generated by each additional worker' }
      ],
      insight: 'Monopsonist hires where MCL = MRP (fewer workers than competitive market) and pays the wage from the supply curve (lower than competitive wage)'
    },
    'supply-demand': {
      keywords: ['supply', 'demand', 'equilibrium', 'market', 'price', 'quantity'],
      axes: { x: 'Quantity (Q)', y: 'Price (P)' },
      curves: [
        { name: 'Demand', slope: 'downward', meaning: 'Quantity consumers want to buy at each price' },
        { name: 'Supply', slope: 'upward', meaning: 'Quantity producers want to sell at each price' }
      ],
      insight: 'Equilibrium occurs where supply equals demand'
    },
    'cost-curves': {
      keywords: ['marginal cost', 'average cost', 'MC', 'AC', 'ATC', 'AVC', 'profit', 'minimize'],
      axes: { x: 'Quantity (Q)', y: 'Cost ($)' },
      curves: [
        { name: 'Marginal Cost (MC)', slope: 'U-shaped then rising', meaning: 'Cost of producing one additional unit' },
        { name: 'Average Total Cost (ATC)', slope: 'U-shaped', meaning: 'Total cost divided by quantity' },
        { name: 'Average Variable Cost (AVC)', slope: 'U-shaped', meaning: 'Variable cost divided by quantity' }
      ],
      insight: 'MC intersects ATC and AVC at their minimum points'
    },
    'production-possibilities': {
      keywords: ['production possibilities', 'PPF', 'PPC', 'opportunity cost', 'tradeoff', 'efficiency'],
      axes: { x: 'Good A (quantity)', y: 'Good B (quantity)' },
      curves: [
        { name: 'Production Possibilities Frontier', slope: 'bowed outward (concave)', meaning: 'Shows maximum combinations of two goods that can be produced with available resources' }
      ],
      insight: 'Points on the curve are efficient; inside is inefficient; outside is unattainable with current resources'
    },
    'aggregate-supply-demand': {
      keywords: ['aggregate', 'AS', 'AD', 'GDP', 'price level', 'macroeconomic', 'LRAS', 'SRAS'],
      axes: { x: 'Real GDP (Y)', y: 'Price Level (P)' },
      curves: [
        { name: 'Aggregate Demand (AD)', slope: 'downward', meaning: 'Total spending in the economy at each price level' },
        { name: 'Short-Run Aggregate Supply (SRAS)', slope: 'upward', meaning: 'Total production in short run at each price level' },
        { name: 'Long-Run Aggregate Supply (LRAS)', slope: 'vertical', meaning: 'Full employment output level' }
      ],
      insight: 'Macroeconomic equilibrium occurs where AD intersects AS; LRAS shows potential GDP'
    }
  },
  calculus: {
    'derivative-graph': {
      keywords: ['derivative', 'slope', 'tangent', 'rate of change', 'increasing', 'decreasing'],
      axes: { x: 'x', y: 'f(x) or y' },
      curves: [
        { name: 'Original function f(x)', slope: 'varies', meaning: 'The function being analyzed' },
        { name: 'Tangent line', slope: 'linear', meaning: 'Shows instantaneous rate of change at a point' }
      ],
      insight: 'Derivative represents the slope of the tangent line at each point'
    },
    'integral-area': {
      keywords: ['integral', 'area', 'accumulation', 'antiderivative', 'bounded'],
      axes: { x: 'x', y: 'f(x) or y' },
      curves: [
        { name: 'Function curve', slope: 'varies', meaning: 'The function being integrated' },
        { name: 'Shaded region', slope: 'N/A', meaning: 'Area represents the definite integral' }
      ],
      insight: 'Integral calculates the accumulated area under the curve'
    },
    'critical-points': {
      keywords: ['critical point', 'local maximum', 'local minimum', 'extrema', 'first derivative', 'second derivative'],
      axes: { x: 'x', y: 'f(x)' },
      curves: [
        { name: 'Function curve', slope: 'varies with peaks/valleys', meaning: 'Shows where derivative equals zero or is undefined' }
      ],
      insight: 'Critical points occur where f\'(x) = 0; use second derivative test to classify as max, min, or inflection point'
    },
    'concavity': {
      keywords: ['concave', 'convex', 'inflection point', 'second derivative', 'curvature'],
      axes: { x: 'x', y: 'f(x)' },
      curves: [
        { name: 'Function curve', slope: 'changes curvature', meaning: 'Concave up (f\'\' > 0) looks like U; concave down (f\'\' < 0) looks like ∩' }
      ],
      insight: 'Inflection points occur where concavity changes (f\'\'(x) = 0 and sign changes)'
    }
  },
  biology: {
    'population-growth': {
      keywords: ['population', 'growth', 'carrying capacity', 'exponential', 'logistic', 'limiting factors'],
      axes: { x: 'Time (t)', y: 'Population Size (N)' },
      curves: [
        { name: 'Exponential Growth', slope: 'J-shaped curve', meaning: 'Unlimited growth when resources are abundant' },
        { name: 'Logistic Growth', slope: 'S-shaped curve', meaning: 'Growth slows as population approaches carrying capacity' }
      ],
      insight: 'Carrying capacity (K) is the maximum population size the environment can sustain; logistic growth levels off at K'
    },
    'enzyme-kinetics': {
      keywords: ['enzyme', 'substrate', 'reaction rate', 'Michaelis-Menten', 'Vmax', 'Km', 'saturation'],
      axes: { x: 'Substrate Concentration [S]', y: 'Reaction Rate (V)' },
      curves: [
        { name: 'Michaelis-Menten curve', slope: 'hyperbolic (steep then plateau)', meaning: 'Shows how reaction rate increases with substrate concentration until enzyme saturation' }
      ],
      insight: 'Vmax is maximum rate when all enzyme active sites are occupied; Km is substrate concentration at half Vmax'
    },
    'cell-cycle': {
      keywords: ['cell cycle', 'interphase', 'mitosis', 'G1', 'S', 'G2', 'M phase', 'checkpoint'],
      axes: { x: 'Time', y: 'DNA Content or Cell Count' },
      curves: [
        { name: 'DNA content over time', slope: 'stepwise increase', meaning: 'DNA doubles during S phase, remains constant in G1/G2, halves after division' }
      ],
      insight: 'Cell cycle consists of interphase (G1, S, G2) and mitotic phase (M); DNA replication occurs only in S phase'
    },
    'photosynthesis-light': {
      keywords: ['photosynthesis', 'light intensity', 'rate', 'limiting factor', 'compensation point', 'light saturation'],
      axes: { x: 'Light Intensity', y: 'Rate of Photosynthesis' },
      curves: [
        { name: 'Photosynthetic rate curve', slope: 'increases then plateaus', meaning: 'Rate increases with light until other factors (CO2, temp) become limiting' }
      ],
      insight: 'Light compensation point: where photosynthesis = respiration; light saturation point: where light no longer limits rate'
    },
    'ecological-pyramid': {
      keywords: ['energy pyramid', 'biomass', 'trophic level', 'producer', 'consumer', '10% rule'],
      axes: { x: 'Trophic Level', y: 'Energy or Biomass' },
      curves: [
        { name: 'Pyramid shape', slope: 'decreases with each level', meaning: 'Shows energy/biomass decreases at each trophic level' }
      ],
      insight: 'Only ~10% of energy transfers between trophic levels; producers (bottom) have most energy, top predators (top) have least'
    }
  },
  chemistry: {
    'titration-curve': {
      keywords: ['titration', 'pH', 'acid', 'base', 'equivalence point', 'buffer', 'neutralization'],
      axes: { x: 'Volume of Titrant Added (mL)', y: 'pH' },
      curves: [
        { name: 'Strong acid-strong base', slope: 'sharp vertical rise at equivalence', meaning: 'pH jumps dramatically at equivalence point (pH = 7)' },
        { name: 'Weak acid-strong base', slope: 'gradual rise with buffer region', meaning: 'Has buffer region before equivalence; equivalence pH > 7' }
      ],
      insight: 'Equivalence point: moles acid = moles base; buffer region resists pH change; indicator changes color at endpoint'
    },
    'reaction-rate': {
      keywords: ['reaction rate', 'concentration', 'time', 'order', 'rate law', 'kinetics'],
      axes: { x: 'Time (s or min)', y: 'Concentration (M)' },
      curves: [
        { name: 'Reactant concentration', slope: 'decreases exponentially', meaning: 'Reactant concentration decreases as reaction proceeds' },
        { name: 'Product concentration', slope: 'increases exponentially', meaning: 'Product concentration increases over time' }
      ],
      insight: 'Reaction rate = change in concentration / change in time; steeper slope = faster reaction'
    },
    'phase-diagram': {
      keywords: ['phase', 'solid', 'liquid', 'gas', 'triple point', 'critical point', 'sublimation', 'deposition'],
      axes: { x: 'Temperature (K or °C)', y: 'Pressure (atm or kPa)' },
      curves: [
        { name: 'Solid-liquid boundary', slope: 'nearly vertical', meaning: 'Melting/freezing line' },
        { name: 'Liquid-gas boundary', slope: 'curved upward', meaning: 'Vaporization/condensation line' },
        { name: 'Solid-gas boundary', slope: 'curved', meaning: 'Sublimation/deposition line' }
      ],
      insight: 'Triple point: all 3 phases coexist; critical point: beyond this, liquid and gas are indistinguishable'
    },
    'equilibrium': {
      keywords: ['equilibrium', 'Le Chatelier', 'forward', 'reverse', 'Keq', 'reaction quotient'],
      axes: { x: 'Time', y: 'Concentration' },
      curves: [
        { name: 'Reactants', slope: 'decreases then plateaus', meaning: 'Reactant concentration decreases until equilibrium' },
        { name: 'Products', slope: 'increases then plateaus', meaning: 'Product concentration increases until equilibrium' }
      ],
      insight: 'At equilibrium: forward rate = reverse rate; concentrations constant (not equal); Keq = [products]/[reactants]'
    }
  },
  physics: {
    'position-time': {
      keywords: ['position', 'displacement', 'distance', 'time', 'motion', 'velocity'],
      axes: { x: 'Time (s)', y: 'Position (m)' },
      curves: [
        { name: 'Position vs time', slope: 'varies', meaning: 'Slope represents velocity; steeper = faster' }
      ],
      insight: 'Slope of position-time graph gives velocity; curved line = changing velocity (acceleration)'
    },
    'velocity-time': {
      keywords: ['velocity', 'speed', 'time', 'acceleration', 'constant', 'motion'],
      axes: { x: 'Time (s)', y: 'Velocity (m/s)' },
      curves: [
        { name: 'Velocity vs time', slope: 'varies', meaning: 'Slope represents acceleration; area under curve = displacement' }
      ],
      insight: 'Slope gives acceleration; horizontal line = constant velocity; area under curve = total displacement'
    },
    'force-diagram': {
      keywords: ['force', 'Newton', 'net force', 'tension', 'friction', 'normal force', 'weight'],
      axes: { x: 'horizontal', y: 'vertical' },
      curves: [
        { name: 'Force vectors', slope: 'arrows', meaning: 'Each arrow represents a force (length = magnitude, direction = direction)' }
      ],
      insight: 'Net force = vector sum of all forces; if net force = 0, object is in equilibrium (Newton\'s 1st law)'
    },
    'energy-conservation': {
      keywords: ['energy', 'kinetic', 'potential', 'conservation', 'mechanical', 'work'],
      axes: { x: 'Position or Time', y: 'Energy (J)' },
      curves: [
        { name: 'Kinetic Energy', slope: 'varies inversely with potential', meaning: 'Energy of motion (KE = ½mv²)' },
        { name: 'Potential Energy', slope: 'varies inversely with kinetic', meaning: 'Stored energy (PE = mgh for gravity)' },
        { name: 'Total Mechanical Energy', slope: 'horizontal', meaning: 'Sum of KE + PE remains constant if no friction' }
      ],
      insight: 'In isolated system, total mechanical energy is conserved; KE and PE convert between each other'
    }
  }
}

function classifyGraphType(surroundingText, visibleElements) {
  const textLower = surroundingText.toLowerCase()
  const elementsLower = visibleElements.toLowerCase()
  const combined = `${textLower} ${elementsLower}`
  
  let bestMatch = null
  let bestScore = 0
  
  for (const [domain, templates] of Object.entries(GRAPH_TEMPLATES)) {
    for (const [templateName, template] of Object.entries(templates)) {
      let score = 0
      for (const keyword of template.keywords) {
        if (combined.includes(keyword.toLowerCase())) {
          score++
        }
      }
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = { domain, templateName, template, matchScore: score }
      }
    }
  }
  
  return bestMatch
}

async function scaffoldGraphPrompt(graphMetadata, surroundingText) {
  // Classify graph type using template library
  const classification = classifyGraphType(surroundingText, graphMetadata.extractedText)
  
  if (classification && classification.matchScore >= 2) {
    // Use template-based scaffolding
    const template = classification.template
    console.log(`         Classified as: ${classification.domain}/${classification.templateName} (score: ${classification.matchScore})`)
    
    const curveDescriptions = template.curves.map((c, idx) => 
      `- **Curve ${idx + 1}: ${c.name}** (${c.slope})\n  ${c.meaning}`
    ).join('\n')
    
    return `[GRAPH STRUCTURE]
**Graph Type:** ${classification.templateName.replace(/-/g, ' ')} (${classification.domain})

**Axes:**
- X-axis: ${template.axes.x}
- Y-axis: ${template.axes.y}

**Curves/Lines:**
${curveDescriptions}

**Key Insight:** ${template.insight}

**Visible Elements Detected:** ${graphMetadata.extractedText || 'minimal labels'}

**Note:** This interpretation is based on standard ${classification.domain} graph conventions and the surrounding context discussing ${template.keywords.slice(0, 3).join(', ')}.
[END GRAPH STRUCTURE]`
  }
  
  // Fallback to LLM-based inference if no template matches
  console.log(`         No strong template match (best score: ${classification?.matchScore || 0}), using LLM inference`)
  
  // Detect subject domain from context
  let subjectHint = 'academic'
  if (/economics|market|supply|demand|price|cost|revenue|profit|monopoly|competition/i.test(surroundingText)) {
    subjectHint = 'economics/business'
  } else if (/derivative|integral|limit|function|calculus|slope|tangent|curve|continuous|discontinuous/i.test(surroundingText)) {
    subjectHint = 'calculus/mathematics'
  } else if (/force|velocity|acceleration|mass|energy|physics|motion|gravity|friction/i.test(surroundingText)) {
    subjectHint = 'physics'
  } else if (/biology|cell|organism|species|population|genetics|evolution/i.test(surroundingText)) {
    subjectHint = 'biology'
  } else if (/chemistry|molecule|reaction|element|compound|bond|solution/i.test(surroundingText)) {
    subjectHint = 'chemistry'
  }
  
  // Build comprehensive prompt for detailed graph structure analysis
  const prompt = `You are analyzing a graph from ${subjectHint} lecture notes. Provide a COMPLETE structural breakdown.

GRAPH ELEMENTS DETECTED:
Caption: ${graphMetadata.caption}
Visible Text: ${graphMetadata.extractedText}
Missing: ${graphMetadata.missingElements}

SURROUNDING CONTEXT (for inference):
${surroundingText.substring(0, 3000)}

TASK: Create a detailed structural interpretation covering:

1. GRAPH TYPE: Identify the type (supply/demand diagram, cost curves, production function, etc.)

2. AXES:
   - X-axis represents: [infer from context, e.g., "Quantity of Labor (L)"]
   - Y-axis represents: [infer from context, e.g., "Wage Rate (W)"]
   - Note any axis labels visible: [list any letters or labels like W, L, P, Q]

3. CURVES/LINES - COUNT AND DESCRIBE EVERY VISIBLE LINE:
   IMPORTANT: Look carefully at the visible elements. If there are TWO upward sloping lines, describe BOTH separately.
   Count total lines/curves visible: [number]
   
   For EACH line, provide:
   - Line/Curve 1: [slope direction] - [economic meaning] - [what it represents]
   - Line/Curve 2: [slope direction] - [economic meaning] - [what it represents]
   - Line/Curve 3: [if present - slope direction] - [economic meaning] - [what it represents]
   - Additional curves: [continue if more exist]
   
   Intersection points and their meaning: [describe equilibrium or key points]

4. KEY INSIGHT: What economic concept/relationship does this graph illustrate?

5. SPECIFICS: If the context mentions specific terms (monopsony, equilibrium, marginal cost, etc.), explain how they map to graph elements.

FORMAT YOUR RESPONSE AS:
**Graph Type:** [type]
**X-Axis:** [meaning]
**Y-Axis:** [meaning]
**Curves:**
- [Line 1 description]
- [Line 2 description]
- [etc.]
**Key Insight:** [main takeaway]
**Specific Elements:** [map context terms to visual elements]

CRITICAL: If you cannot infer something with confidence, state "Cannot determine from context" rather than guessing.`

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: GROQ_MODEL,
      temperature: 0.1, // Lower temp for more factual responses
      max_tokens: 500,
    })

    const scaffolding = completion.choices[0]?.message?.content || ''
    
    // Wrap with semantic markers and fallback clause
    return `[GRAPH STRUCTURE]
${scaffolding}

[FALLBACK NOTICE]: The above interpretation is based on surrounding context. If asked about specific visual elements not described above, respond: "I can see the general structure but cannot identify that specific element from the available information."
[END GRAPH STRUCTURE]`
    
  } catch (error) {
    console.error('         ✗ Scaffolding failed:', error.message)
    return `[GRAPH STRUCTURE]
**Graph Type:** Cannot be determined
**Note:** Automatic graph structure analysis failed. Refer to surrounding context.
[END GRAPH STRUCTURE]`
  }
}

async function enrichGraphDescriptions(pageTexts) {
  console.log('   🔍 Analyzing graphs for context enrichment...')
  let enrichmentCount = 0
  
  for (const page of pageTexts) {
    if (!page.figureMetadata || page.figureMetadata.length === 0) continue
    
    // Enrich ALL graphs, not just those with missing elements
    console.log(`      Page ${page.pageNumber}: Processing ${page.figureMetadata.length} graphs`)
    
    for (let figIndex = 0; figIndex < page.figureMetadata.length; figIndex++) {
      const figMeta = page.figureMetadata[figIndex]
      
      try {
        // Use scaffolded prompt for detailed graph structure
        const scaffoldedInterpretation = await scaffoldGraphPrompt(figMeta, page.text)
        
        if (scaffoldedInterpretation) {
          // Append interpretation after the figure
          const figureMarker = `[END FIGURE ${figIndex + 1}]`
          const replacement = `${scaffoldedInterpretation}\n${figureMarker}`
          page.text = page.text.replace(figureMarker, replacement)
          enrichmentCount++
          console.log(`         ✓ Enriched figure ${figIndex + 1} on page ${page.pageNumber}`)
          const preview = scaffoldedInterpretation.match(/\*\*Graph Type:\*\* ([^\n]+)/)?.[1] || 'analysis complete'
          console.log(`            Preview: ${preview}`)
        }
      } catch (error) {
        console.error(`         ✗ Failed to enrich figure ${figIndex + 1}:`, error.message)
      }
    }
  }
  
  console.log(`   ✓ Graph enrichment complete (${enrichmentCount} graphs interpreted)`)
  return pageTexts
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
