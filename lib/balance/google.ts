import { BalanceInfo } from '@/types'

// Google Gemini quota/billing requires GCP OAuth, not a simple API key.
// Placeholder for when a direct endpoint becomes available.
export async function getGoogleBalance(): Promise<BalanceInfo> {
  return { status: 'unavailable', availableUsd: null }
}
