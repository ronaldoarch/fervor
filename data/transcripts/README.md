# Transcrições para o Fervor

Coloque aqui os arquivos de transcrição dos seus vídeos (`.txt` ou `.md`).

O Fervor usa essas transcrições como base de conhecimento para enriquecer suas respostas — exemplos, frases, insights e estilo de comunicação serão incorporados ao agente.

**Formato:** Um arquivo por vídeo. O nome do arquivo será usado como referência da fonte.

**Após adicionar ou alterar transcrições**, rode a ingestão:

```bash
npm run ingest
```

Isso gera a base de conhecimento (embeddings) usada pelo RAG. Requer `OPENAI_API_KEY` no `.env`.
