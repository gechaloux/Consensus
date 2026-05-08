import Groq from 'groq-sdk'
import { ProviderCallbacks } from '@/types'

export async function streamGroq(question: string, callbacks: ProviderCallbacks, signal?: AbortSignal) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const start = Date.now()
  let full = ''

  try {
    const stream = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
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
