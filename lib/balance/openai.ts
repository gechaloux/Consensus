import { BalanceInfo } from '@/types'

export async function getOpenAIBalance(): Promise<BalanceInfo> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { status: 'unavailable', availableUsd: null }

  try {
    const [subRes, usageRes] = await Promise.all([
      fetch('https://api.openai.com/v1/dashboard/billing/subscription', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8_000),
      }),
      fetch(`https://api.openai.com/v1/dashboard/billing/usage?start_date=${billingMonthStart()}&end_date=${today()}`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8_000),
      }),
    ])

    if (!subRes.ok || !usageRes.ok) return { status: 'unavailable', availableUsd: null }

    const sub = await subRes.json()
    const usage = await usageRes.json()

    const hardLimitUsd: number = sub.hard_limit_usd ?? 0
    const usedUsd: number = (usage.total_usage ?? 0) / 100
    return { status: 'ok', availableUsd: Math.max(0, hardLimitUsd - usedUsd) }
  } catch (e) {
    return { status: 'error', availableUsd: null, error: (e as Error).message }
  }
}

function billingMonthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
