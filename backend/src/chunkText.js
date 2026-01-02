import { v4 as uuidv4 } from 'uuid'

export function chunkText(text, size = 1500, overlap = 200) {
  if (!text) return []
  const chunks = []
  let start = 0
  const len = text.length
  while (start < len) {
    const end = Math.min(start + size, len)
    const chunk = text.slice(start, end)
    chunks.push({ id: uuidv4(), content: chunk })
    start = end - overlap
    if (start < 0) start = 0
  }
  return chunks
}
