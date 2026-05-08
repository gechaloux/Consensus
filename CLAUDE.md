# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Consensus is a Next.js web app that fans a user's question out to four frontier LLMs simultaneously, streams their responses to the browser, and then runs embedding-based consensus detection to show which models agreed and which dissented.

## Commands

```bash
npm run dev          # local dev server (http://localhost:3000)
npm run build        # production build
npm run lint         # eslint

# Docker (production)
cp .env.example .env   # fill in API keys first
docker compose up --build
```

## Architecture

**Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS, deployed as a single Docker container.

**Data flow for a query:**
1. `app/page.tsx` POSTs the question to `/api/query`
2. `app/api/query/route.ts` fans out to all four providers concurrently via `Promise.allSettled`
3. As each provider streams tokens, the route pushes SSE events (`type: chunk | done | error`) to the browser
4. After all providers finish, it calls Ollama for embeddings and emits a final `type: consensus` SSE event
5. The page dispatches events into React state; each `ModelCard` re-renders on every chunk

**Key files:**
- `types/index.ts` — all shared types and the `MODELS` array (add/remove models here)
- `lib/providers/*.ts` — one file per LLM; each exports a single `stream*` function with `ProviderCallbacks`
- `lib/consensus/embeddings.ts` — calls Ollama `POST /api/embed` with `qwen3-embedding:8b`
- `lib/consensus/similarity.ts` — cosine similarity + clique-finding for the largest agreeing cluster
- `app/api/query/route.ts` — SSE endpoint; assembles provider results and runs consensus
- `app/components/` — `QueryForm`, `ModelCard` (streaming text), `ConsensusPanel` (similarity matrix)

**Environment variables** (see `.env.example`):
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`
- `OLLAMA_BASE_URL` — default `http://host.docker.internal:11434` (points to host Ollama from within Docker)
- `CONSENSUS_SIMILARITY_THRESHOLD` — cosine similarity cutoff for "in agreement", default `0.85`

**Adding a new model:** add an entry to `MODELS` in `types/index.ts`, create `lib/providers/<name>.ts`, and add a `streamXxx` call inside the `Promise.allSettled` block in the API route.
