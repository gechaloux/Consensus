import { NextRequest } from 'next/server'
import { streamOpenAI } from '@/lib/providers/openai'
import { streamAnthropic } from '@/lib/providers/anthropic'
import { streamGemini } from '@/lib/providers/gemini'
import { streamGroq } from '@/lib/providers/groq'
import { getEmbeddings } from '@/lib/consensus/embeddings'
import { computeConsensus } from '@/lib/consensus/similarity'
import { ModelId, ProviderCallbacks, SSEEvent } from '@/types'

const PROVIDER_TIMEOUT_MS = 30_000

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) {
    return new Response(JSON.stringify({ error: 'Question is required' }), { status: 400 })
  }
  if (question.length > 10_000) {
    return new Response(JSON.stringify({ error: 'Question too long (max 10 000 characters)' }), { status: 400 })
  }

  const encoder = new TextEncoder()
  const completedResponses = new Map<ModelId, string>()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      const makeCallbacks = (modelId: ModelId): ProviderCallbacks => ({
        onChunk: (chunk) => send({ type: 'chunk', model: modelId, chunk }),
        onComplete: (fullResponse, latencyMs) => {
          completedResponses.set(modelId, fullResponse)
          send({ type: 'done', model: modelId, fullResponse, latencyMs })
        },
        onError: (error) => send({ type: 'error', model: modelId, error }),
      })

      await Promise.allSettled([
        streamOpenAI(question, makeCallbacks('gpt-4o'), AbortSignal.timeout(PROVIDER_TIMEOUT_MS)),
        streamAnthropic(question, makeCallbacks('claude-sonnet-4-6'), AbortSignal.timeout(PROVIDER_TIMEOUT_MS)),
        streamGemini(question, makeCallbacks('gemini-2.0-flash'), AbortSignal.timeout(PROVIDER_TIMEOUT_MS)),
        streamGroq(question, makeCallbacks('llama-3.3-70b-versatile'), AbortSignal.timeout(PROVIDER_TIMEOUT_MS)),
      ])

      const entries = Array.from(completedResponses.entries())
      if (entries.length >= 2) {
        try {
          const modelIds = entries.map(([id]) => id)
          const texts = entries.map(([, text]) => text)
          const embeddings = await getEmbeddings(texts)
          const consensus = computeConsensus(modelIds, embeddings)
          send({ type: 'consensus', consensus })
        } catch (e) {
          send({ type: 'consensus_error', consensusError: (e as Error).message })
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
