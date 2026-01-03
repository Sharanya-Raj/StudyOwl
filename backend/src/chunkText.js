import { v4 as uuidv4 } from 'uuid'

export function* chunkTextGenerator(text, size = 1000, overlap = 150) {
  if (!text || text.length === 0) return
  
  let start = 0
  const len = text.length
  
  // Ensure overlap is less than chunk size to prevent infinite loops
  const safeOverlap = Math.min(overlap, size - 1)
  const step = Math.max(1, size - safeOverlap) // Ensure we always move forward
  
  while (start < len) {
    const end = Math.min(start + size, len)
    const chunk = text.slice(start, end)
    
    if (chunk.length > 0) {
      yield { id: uuidv4(), content: chunk }
    }
    
    // Move to the next chunk position
    start += step
    
    // If we're close to the end, break to avoid tiny final chunks
    if (len - start < size * 0.1) break
  }
}

export function chunkText(text, size = 1000, overlap = 150) {
  return Array.from(chunkTextGenerator(text, size, overlap))
}
