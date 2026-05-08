# Consensus

Ask a question once, get answers from four frontier LLMs simultaneously — then see which models agreed and which dissented.

Consensus fans your question out to GPT-4o, Claude Sonnet, Gemini Flash, and Llama 3.3 70B in parallel, streams their responses live, and then uses local embeddings to detect semantic agreement across the answers.

## How it works

1. You submit a question
2. The API route fans it out to all four providers concurrently via `Promise.allSettled`
3. Each provider streams tokens back via SSE as they arrive
4. Once all providers finish, Ollama embeds every response with `qwen3-embedding:8b`
5. Cosine similarity is computed for every pair of responses
6. The largest clique of models above the similarity threshold is identified as the "agreeing cluster" — the rest are flagged as dissenters

## Models

| Model | Provider |
|---|---|
| GPT-4o | OpenAI |
| Claude Sonnet 4.6 | Anthropic |
| Gemini 2.0 Flash | Google |
| Llama 3.3 70B Versatile | Meta via Groq |

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Ollama** (local) for embeddings — `qwen3-embedding:8b`
- Deployed as a single Docker container

## Getting started

### Local dev

```bash
cp .env.example .env   # fill in your API keys
npm install
npm run dev            # http://localhost:3000
```

You'll need Ollama running locally with the embedding model pulled:

```bash
ollama pull qwen3-embedding:8b
```

### Docker (production)

```bash
cp .env.example .env   # fill in your API keys
docker compose up --build
```

The container expects Ollama on the host at `http://host.docker.internal:11434` by default.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key |
| `GOOGLE_API_KEY` | Yes | — | Google AI API key |
| `GROQ_API_KEY` | Yes | — | Groq API key |
| `OLLAMA_BASE_URL` | No | `http://host.docker.internal:11434` | Ollama endpoint |
| `CONSENSUS_SIMILARITY_THRESHOLD` | No | `0.85` | Cosine similarity cutoff for "in agreement" |

## Adding a model

1. Add an entry to `MODELS` in [types/index.ts](types/index.ts)
2. Create `lib/providers/<name>.ts` exporting a `stream*` function with `ProviderCallbacks`
3. Call it inside the `Promise.allSettled` block in [app/api/query/route.ts](app/api/query/route.ts)

## Project structure

```
app/
  api/query/route.ts        # SSE endpoint — fans out to providers, runs consensus
  components/
    QueryForm.tsx           # Question input
    ModelCard.tsx           # Per-model streaming response card
    ConsensusPanel.tsx      # Similarity matrix + agreement summary
  page.tsx                  # Main page
lib/
  providers/                # One file per LLM provider
  consensus/
    embeddings.ts           # Ollama embed API call
    similarity.ts           # Cosine similarity + clique finding
types/index.ts              # Shared types and MODELS array
```
