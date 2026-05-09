import { getActiveModels } from '@/lib/models'
import { getOpenAIBalance } from '@/lib/balance/openai'
import { getAnthropicBalance } from '@/lib/balance/anthropic'
import { getGoogleBalance } from '@/lib/balance/google'
import { getXAIBalance } from '@/lib/balance/xai'
import { BalanceInfo } from '@/types'

export async function GET() {
  const [openaiInfo, anthropicInfo, googleInfo, xaiInfo] = getActiveModels()

  const [openai, anthropic, google, xai] = await Promise.all([
    getOpenAIBalance(),
    getAnthropicBalance(),
    getGoogleBalance(),
    getXAIBalance(),
  ])

  const result: Record<string, BalanceInfo> = {
    [openaiInfo.id]: openai,
    [anthropicInfo.id]: anthropic,
    [googleInfo.id]: google,
    [xaiInfo.id]: xai,
  }

  return Response.json(result)
}
