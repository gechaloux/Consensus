'use client'

import { useRef, useState } from 'react'
import QueryForm from './components/QueryForm'
import ModelCard from './components/ModelCard'
import ConsensusPanel from './components/ConsensusPanel'
import { MODELS, ModelId, SSEEvent, ConsensusResult } from '@/types'

interface ModelState {
  text: string
  done: boolean
  latencyMs?: number
  error?: string
}

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'complete'>('idle')
  const [responses, setResponses] = useState<Record<string, ModelState>>({})
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null)
  const [consensusError, setConsensusError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleSubmit = async (question: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    const initial: Record<string, ModelState> = {}
    MODELS.forEach(m => { initial[m.id] = { text: '', done: false } })
    setResponses(initial)
    setConsensus(null)
    setConsensusError(null)
    setStatus('loading')

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: abortRef.current.signal,
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            dispatch(JSON.parse(line.slice(6)) as SSEEvent)
          } catch { /* malformed line */ }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }

    setStatus('complete')
  }

  const dispatch = (event: SSEEvent) => {
    if (event.type === 'chunk' && event.model) {
      const id = event.model as ModelId
      setResponses(prev => ({
        ...prev,
        [id]: { ...prev[id], text: (prev[id]?.text ?? '') + (event.chunk ?? '') },
      }))
    } else if (event.type === 'done' && event.model) {
      const id = event.model as ModelId
      setResponses(prev => ({
        ...prev,
        [id]: { ...prev[id], done: true, latencyMs: event.latencyMs },
      }))
    } else if (event.type === 'error' && event.model) {
      const id = event.model as ModelId
      setResponses(prev => ({
        ...prev,
        [id]: { ...prev[id], done: true, error: event.error },
      }))
    } else if (event.type === 'consensus' && event.consensus) {
      setConsensus(event.consensus)
    } else if (event.type === 'consensus_error' && event.consensusError) {
      setConsensusError(event.consensusError)
    }
  }

  const consensusPlaceholder =
    status === 'idle'
      ? 'Consensus will appear here after all models respond.'
      : 'Computing consensus once all models have responded…'

  return (
    <main className="cq-page">
      <div className="cq-container">
        <header className="cq-page-head">
          <h1 className="cq-page-title">Consensus</h1>
          <p className="cq-page-tag">Ask a question. See where models agree.</p>
        </header>

        <QueryForm onSubmit={handleSubmit} loading={status === 'loading'} />

        <div className="cq-grid">
          {MODELS.map(model => (
            <ModelCard key={model.id} model={model} state={responses[model.id]} />
          ))}
        </div>

        {consensus ? (
          <ConsensusPanel result={consensus} />
        ) : consensusError ? (
          <ConsensusPanel result={{} as ConsensusResult} error={consensusError} />
        ) : (
          <div className="cq-consensus-unavail" style={status === 'idle' ? { color: 'var(--text-faint)' } : undefined}>
            {consensusPlaceholder}
          </div>
        )}
      </div>
    </main>
  )
}
