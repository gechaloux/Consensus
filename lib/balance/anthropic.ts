import { BalanceInfo } from '@/types'

// Anthropic does not expose a public billing/balance API.
// Placeholder for when they do.
export async function getAnthropicBalance(): Promise<BalanceInfo> {
  return { status: 'unavailable', availableUsd: null }
}
