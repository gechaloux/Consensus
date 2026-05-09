import { BalanceInfo } from '@/types'

// xAI does not currently expose a public billing/balance API.
// Placeholder for when they do.
export async function getXAIBalance(): Promise<BalanceInfo> {
  return { status: 'unavailable', availableUsd: null }
}
