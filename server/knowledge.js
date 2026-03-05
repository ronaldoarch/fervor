/**
 * RAG (Retrieval-Augmented Generation) para transcrições e relatórios PDF.
 * Usa embeddings da OpenAI para recuperar trechos relevantes e injetar no contexto do Fervor.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import OpenAI from 'openai'

const require = createRequire(import.meta.url)
const { PDFParse } = require('pdf-parse')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRANSCRIPTS_DIR = path.join(__dirname, '..', 'data', 'transcripts')
const REPORTS_DIR = path.join(__dirname, '..', 'data', 'reports')
const KNOWLEDGE_FILE = path.join(__dirname, '..', 'data', 'knowledge.json')

const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 150
const TOP_K = 5

let knowledgeCache = null

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + size, text.length)
    let chunk = text.slice(start, end)
    if (end < text.length && chunk.includes(' ')) {
      const lastSpace = chunk.lastIndexOf(' ')
      if (lastSpace > size / 2) chunk = chunk.slice(0, lastSpace + 1)
    }
    const trimmed = chunk.trim()
    if (trimmed.length > 50) chunks.push(trimmed)
    start = end < text.length ? start + chunk.length - overlap : text.length
  }
  return chunks
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export function loadTranscripts() {
  if (!fs.existsSync(TRANSCRIPTS_DIR)) return []
  const files = fs.readdirSync(TRANSCRIPTS_DIR).filter((f) => /\.(txt|md)$/i.test(f))
  const result = []
  for (const file of files) {
    const filePath = path.join(TRANSCRIPTS_DIR, file)
    const text = fs.readFileSync(filePath, 'utf8').trim()
    if (text) result.push({ source: path.basename(file, path.extname(file)), text })
  }
  return result
}

function findPdfsRecursive(dir) {
  const files = []
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findPdfsRecursive(full))
    } else if (/\.pdf$/i.test(entry.name) && !entry.name.startsWith('._')) {
      files.push(full)
    }
  }
  return files
}

/** Carrega relatórios PDF de data/reports/ (incluindo subpastas) e extrai o texto. */
export async function loadReports() {
  const pdfPaths = findPdfsRecursive(REPORTS_DIR)
  const result = []
  for (const filePath of pdfPaths) {
    const fileName = path.basename(filePath)
    const buffer = fs.readFileSync(filePath)
    let parser
    try {
      parser = new PDFParse({ data: buffer })
      const { text } = await parser.getText()
      await parser.destroy()
      const trimmed = (text || '').trim()
      if (trimmed.length > 100) {
        result.push({ source: path.basename(fileName, '.pdf'), text: trimmed })
      }
    } catch (e) {
      if (parser) try { await parser.destroy() } catch (_) {}
      console.warn(`[RAG] Ignorando PDF ${fileName}: ${e.message}`)
    }
  }
  return result
}

/** Carrega todas as fontes (transcrições + relatórios PDF). */
export async function loadAllSources() {
  const transcripts = loadTranscripts()
  const reports = await loadReports()
  return [...transcripts, ...reports]
}

export async function buildKnowledgeBase(apiKey) {
  const sources = await loadAllSources()
  if (sources.length === 0) {
    console.log('[RAG] Nenhuma fonte em data/transcripts/ ou data/reports/')
    return { chunks: [] }
  }

  const chunks = []
  for (const { source, text } of sources) {
    const parts = chunkText(text)
    for (const part of parts) {
      chunks.push({ text: part, source })
    }
  }

  if (chunks.length === 0) {
    console.log('[RAG] Nenhum chunk gerado')
    return { chunks: [] }
  }

  const openai = new OpenAI({ apiKey })
  const model = 'text-embedding-3-small'

  for (let i = 0; i < chunks.length; i++) {
    const res = await openai.embeddings.create({
      model,
      input: chunks[i].text.slice(0, 8000),
    })
    chunks[i].embedding = res.data[0].embedding
  }

  const knowledge = { chunks, updatedAt: new Date().toISOString() }
  const dir = path.dirname(KNOWLEDGE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(knowledge, null, 0), 'utf8')
  console.log(`[RAG] Base de conhecimento atualizada: ${chunks.length} chunks de ${sources.length} fontes`)
  return knowledge
}

function loadKnowledge() {
  if (knowledgeCache) return knowledgeCache
  if (!fs.existsSync(KNOWLEDGE_FILE)) return null
  try {
    const raw = fs.readFileSync(KNOWLEDGE_FILE, 'utf8')
    knowledgeCache = JSON.parse(raw)
    return knowledgeCache
  } catch (e) {
    console.error('[RAG] Erro ao carregar knowledge.json:', e.message)
    return null
  }
}

export async function getRelevantChunks(query, apiKey, k = TOP_K) {
  const knowledge = loadKnowledge()
  if (!knowledge?.chunks?.length) return []

  const openai = new OpenAI({ apiKey })
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query.slice(0, 8000),
  })
  const queryEmbedding = res.data[0].embedding

  const scored = knowledge.chunks.map((c) => ({
    ...c,
    score: cosineSimilarity(c.embedding, queryEmbedding),
  }))
  scored.sort((a, b) => b.score - a.score)

  const top = scored.slice(0, k).filter((c) => c.score > 0.3)
  return top.map(({ text, source }) => ({ text, source }))
}

export function formatChunksForPrompt(chunks) {
  if (!chunks?.length) return ''
  const blocks = chunks.map((c) => `[${c.source}]\n${c.text}`)
  return `## CONHECIMENTO DOS TRANSCRITOS (use para enriquecer sua resposta, exemplos e tom)\n\n${blocks.join('\n\n---\n\n')}`
}
