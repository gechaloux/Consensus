import { NextRequest } from 'next/server'
import { streamOpenAI } from '@/lib/providers/openai'
import { streamAnthropic } from '@/lib/providers/anthropic'
import { streamGemini } from '@/lib/providers/gemini'
import { streamXAI } from '@/lib/providers/xai'
import { getEmbeddings } from '@/lib/consensus/embeddings'
import { computeConsensus } from '@/lib/consensus/similarity'
import { getActiveModels } from '@/lib/models'
import { ModelId, ProviderCallbacks, SSEEvent } from '@/types'

const PROVIDER_TIMEOUT_MS = 30_000

function buildCouncilPrompt(
  question: string,
  peers: { name: string; response: string }[],
): string {
  const peerSection = peers
    .map(p => `[${p.name}]:\n${p.response}`)
    .join('\n\n---\n\n')

  return `You are one of several AI advisors on a deliberative council. The council has been deliberating on the following question:

"${question}"

${peers.length} of your fellow council members have converged on a shared position. Their responses are presented here for your consideration:

${peerSection}

The council seeks a unanimous decision. Having reviewed your peers' reasoning, you are invited to reconsider your position. Do you find yourself in agreement with the emerging consensus, or do you maintain a dissenting view? Please provide your full revised response.`
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { question, dissenterIds, agreeingResponses } = body as {
    question: string
    dissenterIds: ModelId[]
    agreeingResponses: { modelId: ModelId; modelName: string; text: string }[]
  }

  if (!question || !dissenterIds?.length || !agreeingResponses?.length) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  const activeModels = getActiveModels()
  const [openaiInfo, anthropicInfo, googleInfo, xaiInfo] = activeModels

  const providerFns: Record<string, (q: string, cb: ProviderCallbacks, signal?: AbortSignal) => Promise<void>> = {
    [openaiInfo.id]: streamOpenAI,
    [anthropicInfo.id]: streamAnthropic,
    [googleInfo.id]: streamGemini,
    [xaiInfo.id]: streamXAI,
  }

  const councilPrompt = buildCouncilPrompt(
    question,
    agreeingResponses.map(r => ({ name: r.modelName, response: r.text })),
  )

  const encoder = new TextEncoder()
  const completedResponses = new Map<ModelId, string>(
    agreeingResponses.map(r => [r.modelId, r.text])
  )

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

      await Promise.allSettled(
        dissenterIds
          .filter(id => providerFns[id])
          .map(id => providerFns[id](councilPrompt, makeCallbacks(id), AbortSignal.timeout(PROVIDER_TIMEOUT_MS)))
      )

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
