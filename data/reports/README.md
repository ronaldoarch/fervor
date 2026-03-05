# Relatórios de tendências (PDF)

Coloque aqui os PDFs de relatórios de tendências para enriquecer a base de conhecimento do Fervor.

## Como adicionar os relatórios Trends 2026

1. Acesse a pasta no Google Drive: [Trends 2026_ACIG](https://drive.google.com/drive/folders/1HlkpNtS61d6lGGKZNeC6FMELvR7hQra8)
2. Baixe os PDFs que deseja incluir (ou todos)
3. Copie os arquivos para esta pasta: `data/reports/`
4. Rode a ingestão: `npm run ingest`

O script extrai o texto dos PDFs e gera embeddings junto com as transcrições. PDFs muito grandes podem demorar mais para processar.

## Formatos suportados

- **Transcrições**: `data/transcripts/` — arquivos `.txt` ou `.md`
- **Relatórios**: `data/reports/` — arquivos `.pdf`
