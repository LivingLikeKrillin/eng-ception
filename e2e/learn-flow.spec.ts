import { test, expect } from '@playwright/test'

// Drives the full v9 7-step flow in mock mode through a real browser, asserting that
// each step's distinctive v9 UI actually renders. This is the automated counterpart to
// the Chunk 7 manual browser smoke (7.2 steps 4-12). Assertions anchor on static UI copy
// (fixture-independent) and data-testids for the dynamic choice/verb/block/connector buttons.
//
// In all three mock fixtures the first patternQuiz verb option (id 'a') is the correct
// trigger verb, and every fixture has 3 assembly blocks + one correct connector — so the
// flow is deterministic regardless of which fixture hashIndex selects for the input.
test('v9 7-step learning flow renders end-to-end in mock mode', async ({ page }) => {
  await page.goto('/learn/custom')

  // --- Custom input → start session ---
  await page.getByPlaceholder('한국어로 그냥 적어봐. 맞춤법 신경 쓸 필요 없어.').fill('그가 화내게 만들었어')
  await page.getByRole('button', { name: '풀어보기' }).click()

  // --- Empathy (min 2.5s) auto-advances to Pre-check once payload is ready ---
  await expect(page.getByRole('heading', { name: '이걸 영어로 말한다면' })).toBeVisible({ timeout: 15_000 })

  // --- Pre-check: pick a direction ---
  await page.getByTestId('precheck-choice').first().click()

  // --- Step 0 (Structure): two-chip header (5형식 hero + 담화) ---
  await expect(page.getByText('5형식 패턴')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('담화', { exact: true })).toBeVisible()
  await expect(page.getByText('이 문장이 하는 일')).toBeVisible()

  // patternQuiz hint scaffold: "잘 모르겠어" reveals a hint and keeps the quiz OPEN
  // (no advance button yet) — the desirable-difficulty behaviour from the expert review.
  await page.getByText('잘 모르겠어').click()
  await expect(page.getByText('힌트', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '다음 →' })).toHaveCount(0)

  // Now pick the correct trigger verb (option 'a') → feedback + advance unlocks.
  await page.getByTestId('quiz-verb').first().click()
  const advance0 = page.getByRole('button', { name: '다음 →' })
  await expect(advance0).toBeVisible()
  await advance0.click()

  // --- Step 1 (Assemble): place 3 blocks (slot labels appear), pick a connector ---
  await expect(page.getByText('5형식 슬롯을 채워봐')).toBeVisible()
  const blocks = page.getByTestId('assemble-block')
  await expect(blocks).toHaveCount(3)
  await blocks.nth(0).click()
  await blocks.nth(1).click()
  await blocks.nth(2).click()
  // a 5형식 slot label renders on a selected block
  await expect(page.getByText(/주어|동사|목적어|보어/).first()).toBeVisible()
  // connectors only appear once all 3 blocks are placed
  await page.getByTestId('connector').first().click()
  await page.getByRole('button', { name: '문장 검토하기' }).click()

  // --- Step 2 (Feedback): word-order compare + 자동성 노트 (PatternNoteCard) ---
  await expect(page.getByText('English', { exact: true })).toBeVisible()
  await expect(page.getByText('다음에 떠올릴 틀')).toBeVisible()
  await page.getByRole('button', { name: '이 패턴 내 걸로 만들기' }).click()

  // --- Step 3 (Reflect): saved-pattern card + after-choice ---
  await expect(page.getByText('PATTERN SAVED')).toBeVisible()
  await expect(page.getByText('방금 조립할 때는?')).toBeVisible()
  await page.getByTestId('after-choice').first().click()
  await page.getByRole('button', { name: '다음', exact: true }).click()

  // --- Step 4 (Complete) → back home ---
  await expect(page.getByText('하나 풀었다')).toBeVisible()
  await page.getByRole('button', { name: '다음 문장으로' }).click()
  await expect(page).toHaveURL('http://localhost:5219/')

  // --- Persistence: a verb-specific pattern + a v4 record landed in localStorage ---
  const patternsRaw = await page.evaluate(() => localStorage.getItem('eng-ception:patterns'))
  const patterns = JSON.parse(patternsRaw ?? '[]')
  expect(patterns.length).toBeGreaterThanOrEqual(1)
  expect(patterns[0].patternId).toBeTruthy()
  expect(patterns[0].triggerVerb).toBeTruthy()

  const recordsRaw = await page.evaluate(() => localStorage.getItem('eng-ception:records'))
  const records = JSON.parse(recordsRaw ?? '[]')
  expect(records.length).toBeGreaterThanOrEqual(1)
  expect(records[0].schemaVersion).toBe(5)
  expect(records[0].pattern5hId).toBeTruthy()
})
