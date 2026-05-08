import { GoogleGenerativeAI } from '@google/generative-ai'
import { ProviderCallbacks } from '@/types'

export async function streamGemini(question: string, callbacks: ProviderCallbacks, signal?: AbortSignal) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  const start = Date.now()
  let full = ''

  try {
    const result = await model.generateContentStream(question, { signal })
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) { full += text; callbacks.onChunk(text) }
    }
    callbacks.onComplete(full, Date.now() - start)
  } catch (e) {
    callbacks.onError((e as Error).message)
  }
}
