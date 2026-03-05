#!/usr/bin/env node
/**
 * Ingestão de transcrições para a base de conhecimento do Fervor.
 * Rode após adicionar ou alterar arquivos em data/transcripts/
 *
 * Uso: node scripts/ingest-transcripts.js
 * Requer: OPENAI_API_KEY no .env
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildKnowledgeBase, loadAllSources } from '../server/knowledge.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error('OPENAI_API_KEY não configurada no .env')
  process.exit(1)
}

const sources = await loadAllSources()
if (sources.length === 0) {
  console.log('Nenhum arquivo em data/transcripts/ (.txt, .md) ou data/reports/ (.pdf)')
  console.log('Adicione transcrições ou relatórios e rode novamente.')
  process.exit(0)
}

console.log(`Processando ${sources.length} fonte(s)...`)
await buildKnowledgeBase(apiKey)
console.log('Pronto.')
