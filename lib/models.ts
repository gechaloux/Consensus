import { ModelInfo } from '@/types'

export function getActiveModels(): ModelInfo[] {
  return [
    { id: process.env.OPENAI_MODEL    ?? 'gpt-4o',                  name: 'GPT-4o',        provider: 'OpenAI',    color: '#74AA9C' },
    { id: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',       name: 'Claude Sonnet', provider: 'Anthropic', color: '#D97706' },
    { id: process.env.GOOGLE_MODEL    ?? 'gemini-2.0-flash',        name: 'Gemini Flash',  provider: 'Google',    color: '#4285F4' },
    { id: process.env.XAI_MODEL       ?? 'grok-3',                  name: 'Grok 3',        provider: 'xAI',       color: '#7C3AED' },
  ]
}
