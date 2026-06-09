/**
 * Content-pack generation aid (human-in-loop). Calls the real Claude with the live
 * SYSTEM_PROMPT for each seed scenario, validates the result, and prints a paste-ready
 * `<scenarioId>: <SessionPayload>,` block for src/data/contentPack.ts. You review each
 * output for pedagogical quality (esp. the isFiveHMoment verdict) before committing.
 *
 * Run (Node 22+):
 *   ANTHROPIC_API_KEY=sk-... node --experimental-strip-types scripts/gen-content-pack.ts [s3 s7 ...]
 * No args → all 15 seeds. NOT part of build/test (lives outside src/, eslint-ignored).
 */
import { SYSTEM_PROMPT, buildUserMessage } from '../src/services/prompts.ts'
import { assertSessionPayload } from '../src/services/validate.ts'
import { seedScenarios } from '../src/data/seed-scenarios.ts'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('Set ANTHROPIC_API_KEY first.')
  process.exit(1)
}

const ids = process.argv.slice(2)
const targets = ids.length ? seedScenarios.filter((s) => ids.includes(s.id)) : seedScenarios

for (const s of targets) {
  process.stderr.write(`generating ${s.id}…\n`)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(s.originalKorean) }],
      }),
    })
    const data = await res.json()
    const text: string = data?.content?.[0]?.text ?? ''
    const payload = JSON.parse(text)
    assertSessionPayload(payload) // throws on schema/discriminant violation
    console.log(`  // ${s.id} — ${s.originalKorean}`)
    console.log(`  ${s.id}: ${JSON.stringify(payload, null, 2)},\n`)
  } catch (e) {
    process.stderr.write(`  [${s.id}] FAILED: ${(e as Error).message}\n`)
  }
}
