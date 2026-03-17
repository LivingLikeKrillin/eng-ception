import type {
  ChatStep,
  DecomposeResponse,
  EasyKoreanResponse,
  EnglishResponse,
  PatternResponse,
} from '../types'
import { SYSTEM_PROMPTS, buildUserMessage } from './prompts'

const API_URL = '/api/chat'
const MAX_RETRIES = 1

type StepResponseMap = {
  decompose: DecomposeResponse
  'easy-korean': EasyKoreanResponse
  english: EnglishResponse
  pattern: PatternResponse
}

export async function callClaude<T extends ChatStep>(
  step: T,
  data: Record<string, unknown>,
): Promise<StepResponseMap[T]> {
  const systemPrompt = SYSTEM_PROMPTS[step === 'easy-korean' ? 'easyKorean' : step]
  const userMessage = buildUserMessage(step, data)

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, systemPrompt, userMessage }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const json = await response.json()
      return json as StepResponseMap[T]
    } catch (error) {
      lastError = error as Error
      if (attempt < MAX_RETRIES) continue
    }
  }

  throw lastError ?? new Error('Unknown error')
}
