# Knowledge Base Seed Data

This directory contains medical guidelines and reference materials that are loaded into the Clara knowledge base for RAG (Retrieval-Augmented Generation).

## Files

| File | Description | Source |
|------|-------------|--------|
| CDC-ChestPain.txt | Chest pain evaluation guidelines | CDC/ACC |
| AHA-HeartFailure.txt | Heart failure management summary | AHA/ACC |

## Adding New Documents

1. Place `.txt` files in this directory
2. Files will be chunked and embedded on startup
3. Use clear, structured formatting for better retrieval

## Chunking Configuration

- Chunk size: 500 tokens
- Overlap: 100 tokens
- Embedding model: text-embedding-3-small (1536 dimensions)

## Categories

Documents are auto-categorized based on filename prefix:
- `CDC-*` → category: "cdc"
- `AHA-*` → category: "aha"
- `WHO-*` → category: "who"
- `NICE-*` → category: "nice"
- `FDA-*` → category: "fda"
