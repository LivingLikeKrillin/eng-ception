import { test, expect } from '@playwright/test'

// Tests the SRS-driven re-practice flow:
// 1. Complete a full session (7 steps) to produce a saved pattern
// 2. Backdate the pattern's nextDueAt to the past (simulating an overdue card) via localStorage
// 3. Navigate to 복습 and assert the "오늘 복습" section appears
// 4. Tap "복습 →" and assert the OFFLINE recall card (no API): reveal English, self-rate,
//    overlay closes (the card is rescheduled out of the due queue).
test('srs: complete session -> due card in 복습 -> offline recall reschedules', async ({ page }) => {
  await page.goto('/learn/custom')

  // --- Complete a full 7-step session (mirrors learn-flow.spec.ts walkthrough) ---
  await page.getByPlaceholder('한국어로 그냥 적어봐. 맞춤법 신경 쓸 필요 없어.').fill('그가 화내게 만들었어')
  await page.getByRole('button', { name: '풀어보기' }).click()

  // Empathy screen
  await expect(page.getByRole('heading', { name: '이걸 영어로 말한다면' })).toBeVisible({ timeout: 15_000 })

  // Pre-check
  await page.getByTestId('precheck-choice').first().click()

  // Step 0 — patternQuiz: hint path then answer
  await expect(page.getByText('5형식 패턴')).toBeVisible({ timeout: 10_000 })
  await page.getByText('잘 모르겠어').click()
  await expect(page.getByText('힌트', { exact: true })).toBeVisible()
  await page.getByTestId('quiz-verb').first().click()
  await page.getByRole('button', { name: '다음 →' }).click()

  // Step 1 — assemble blocks + connector
  await expect(page.getByText('5형식 슬롯을 채워봐')).toBeVisible()
  const blocks = page.getByTestId('assemble-block')
  await expect(blocks).toHaveCount(3)
  await blocks.nth(0).click()
  await blocks.nth(1).click()
  await blocks.nth(2).click()
  await page.getByTestId('connector').first().click()
  await page.getByRole('button', { name: '문장 검토하기' }).click()

  // Step 2 — feedback
  await expect(page.getByText('English', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '이 패턴 내 걸로 만들기' }).click()

  // Step 3 — reflect
  await expect(page.getByText('PATTERN SAVED')).toBeVisible()
  await page.getByTestId('after-choice').first().click()
  await page.getByRole('button', { name: '다음', exact: true }).click()

  // Step 4 — complete → home
  await expect(page.getByText('하나 풀었다')).toBeVisible()
  await page.getByRole('button', { name: '다음 문장으로' }).click()
  await expect(page).toHaveURL('http://localhost:5219/')

  // --- Backdate nextDueAt to make the pattern card appear as due ---
  // After complete(), FSRS schedules the card to a future date. For the UI test we
  // force the card overdue by setting nextDueAt to yesterday via localStorage.
  await page.evaluate(() => {
    const raw = localStorage.getItem('engception:patterns')
    if (!raw) return
    const patterns = JSON.parse(raw) as Array<Record<string, unknown>>
    const yesterday = new Date(Date.now() - 86_400_000).toISOString()
    patterns.forEach((p) => { p.nextDueAt = yesterday })
    localStorage.setItem('engception:patterns', JSON.stringify(patterns))
  })

  // --- Navigate to 복습 ---
  await page.goto('/review')

  // Due queue should have a card (backdated to yesterday)
  await expect(page.getByText(/오늘 복습/)).toBeVisible({ timeout: 5_000 })

  // Tap 복습 → on the first due card → offline recall overlay (no API call)
  await page.getByRole('button', { name: '복습 →' }).first().click()
  await expect(page.getByTestId('recall-card')).toBeVisible()

  // Korean prompt shown; reveal the stored English (no network)
  await page.getByRole('button', { name: '영어 보기' }).click()
  await expect(page.getByTestId('recall-card').getByText('I made him angry.')).toBeVisible()

  // Self-rate 정확 → card rescheduled, overlay closes
  await page.getByRole('button', { name: '정확' }).click()
  await expect(page.getByTestId('recall-card')).toBeHidden()
})
