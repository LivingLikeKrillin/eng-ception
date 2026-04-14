import type { SessionPayload } from '../types/v8'
import { SYSTEM_PROMPT, buildUserMessage } from './prompts'
import { assertSessionPayload } from './validate'
import { mockSessionPayload } from './mocks'

const API_URL = '/api/chat'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const MAX_RETRIES = 1
const FETCH_TIMEOUT_MS = 4_000

export async function fetchSessionPayload(korean: string): Promise<SessionPayload> {
  if (USE_MOCK) return mockSessionPayload(korean)

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchOnce(korean)
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < MAX_RETRIES) continue
    }
  }
  throw lastError ?? new Error('unknown')
}

async function fetchOnce(korean: string): Promise<SessionPayload> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: SYSTEM_PROMPT,
        userMessage: buildUserMessage(korean),
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const json = await res.json()
    assertSessionPayload(json)
    return json
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('timeout')
    throw e
  } finally {
    clearTimeout(timer)
  }
}
