import Anthropic from '@anthropic-ai/sdk'
import { ProviderCallbacks } from '@/types'

export async function streamAnthropic(question: string, callbacks: ProviderCallbacks, signal?: AbortSignal) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const start = Date.now()
  let full = ''

  try {
    const stream = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: question }],
      stream: true,
    }, { signal })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        full += event.delta.text
        callbacks.onChunk(event.delta.text)
      }
    }
    callbacks.onComplete(full, Date.now() - start)
  } catch (e) {
    callbacks.onError((e as Error).message)
  }
}
