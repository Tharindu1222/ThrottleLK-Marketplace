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

test('login form has persistent labels and is noindexed', async ({ page }) => {
  const response = await page.goto('/en/login');
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByText('Email', { exact: true })).toBeVisible();
  await expect(page.getByText('Password', { exact: true })).toBeVisible();
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  expect(robots ?? '').toMatch(/noindex/i);
});

test('compare empty state does not crash', async ({ page }) => {
  await page.goto('/en/compare');
  await expect(page.getByText(/no bikes selected/i)).toBeVisible();
});

test('unknown locale path shows a recovery 404', async ({ page }) => {
  const response = await page.goto('/en/this-page-does-not-exist-throttlelk');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /browse bikes/i })).toBeVisible();
});
