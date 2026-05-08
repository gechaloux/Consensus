import OpenAI from 'openai'
import { ProviderCallbacks } from '@/types'

export async function streamOpenAI(question: string, callbacks: ProviderCallbacks, signal?: AbortSignal) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const start = Date.now()
  let full = ''

  try {
    const stream = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: question }],
      stream: true,
    }, { signal })
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) { full += text; callbacks.onChunk(text) }
    }
    callbacks.onComplete(full, Date.now() - start)
  } catch (e) {
    callbacks.onError((e as Error).message)
  }
}
