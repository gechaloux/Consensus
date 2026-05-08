export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const res = await fetch(`${baseUrl}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen3-embedding:8b', input: texts }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Ollama embed failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.embeddings as number[][]
}
