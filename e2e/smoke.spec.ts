import { expect, test } from '@playwright/test';

test('skip link and legal review status on English terms', async ({ page }) => {
  await page.goto('/en/terms');
  const skip = page.getByRole('link', { name: /skip to main content/i });
  await expect(skip).toHaveAttribute('href', '#main-content');
  await expect(
    page.getByText(/pending lawyer \/ owner sign-off/i),
  ).toBeVisible();
  const stored = await page.evaluate(() => ({
    access: window.localStorage.getItem('throttlelk_access'),
    refresh: window.localStorage.getItem('throttlelk_refresh'),
  }));
  expect(stored.access).toBeNull();
  expect(stored.refresh).toBeNull();
});

test('Sinhala locale sets lang and skip link', async ({ page }) => {
  await page.goto('/si/terms');
  await expect(page.locator('html')).toHaveAttribute('lang', 'si');
  await expect(
    page.getByRole('link', { name: 'ප්‍රධාන අන්තර්ගතයට යන්න' }),
  ).toHaveAttribute('href', '#main-content');
});
