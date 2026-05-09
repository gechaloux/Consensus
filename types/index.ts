export type ModelId = string

export interface ModelInfo {
  id: ModelId
  name: string
  provider: string
  color: string
}

export const MODELS: ModelInfo[] = [
  { id: 'gpt-4o',                   name: 'GPT-4o',         provider: 'OpenAI',    color: '#74AA9C' },
  { id: 'claude-sonnet-4-6',        name: 'Claude Sonnet',  provider: 'Anthropic', color: '#D97706' },
  { id: 'gemini-2.0-flash',         name: 'Gemini Flash',   provider: 'Google',    color: '#4285F4' },
  { id: 'llama-3.3-70b-versatile',  name: 'Llama 3.3 70B', provider: 'Meta/Groq', color: '#7C3AED' },
]

export interface ProviderCallbacks {
  onChunk: (chunk: string) => void
  onComplete: (fullResponse: string, latencyMs: number) => void
  onError: (error: string) => void
}

export interface SSEEvent {
  type: 'chunk' | 'done' | 'error' | 'consensus' | 'consensus_error' | 'models'
  model?: ModelId
  chunk?: string
  fullResponse?: string
  latencyMs?: number
  error?: string
  consensus?: ConsensusResult
  consensusError?: string
  models?: ModelInfo[]
}

export interface BalanceInfo {
  status: 'ok' | 'unavailable' | 'error'
  availableUsd: number | null
  error?: string
}

export interface ConsensusResult {
  consensusReached: boolean
  agreementPct: number
  largestClusterModels: ModelId[]
  outlierModels: ModelId[]
  similarityMatrix: Record<string, Record<string, number>>
  totalModels: number
  respondedModels: number
}
