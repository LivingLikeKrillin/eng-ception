import { test, expect } from '@playwright/test'

// First-run onboarding: a brand-new visitor (empty localStorage) sees the 3-card intro.
// "시작하기" drops them into a curated first session (content-pack seed s1 → loads instantly,
// even in mock mode); "건너뛰기" closes to Home and never resurfaces.

test('first visit shows onboarding → 시작하기 reaches a session', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()

  // advance the 2 content cards → CTA card
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('button', { name: '시작하기' }).click()

  // seed s1 is in the content pack → session starts; empathy auto-advances to precheck
  await expect(page.getByRole('heading', { name: '이걸 영어로 말한다면' })).toBeVisible({ timeout: 15_000 })
})

test('건너뛰기 closes onboarding and it does not resurface on reload', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('onboarding').waitFor()
  await page.getByRole('button', { name: '건너뛰기' }).click()
  await expect(page.getByTestId('onboarding')).toBeHidden()

  await page.reload()
  // flag persisted → Home renders (quick-input visible) and onboarding stays gone
  await expect(page.getByPlaceholder('한국어로 그냥 적어봐. 맞춤법 신경 쓸 필요 없어.')).toBeVisible()
  await expect(page.getByTestId('onboarding')).toBeHidden()
})
