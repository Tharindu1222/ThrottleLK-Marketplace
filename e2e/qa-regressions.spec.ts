import { test, expect } from '@playwright/test';

test('production CSP permits both configured analytics providers', async ({
  page,
}) => {
  await page.route('https://www.googletagmanager.com/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'window.__qaGoogle = true;',
    }),
  );
  await page.route('https://www.clarity.ms/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'window.__qaClarity = true;',
    }),
  );
  await page.goto('/en/terms');
  await page.evaluate(() => {
    for (const url of [
      'https://www.googletagmanager.com/gtag/js?id=QA',
      'https://www.clarity.ms/tag/QA',
    ]) {
      const script = document.createElement('script');
      script.src = url;
      document.head.append(script);
    }
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean((window as unknown as { __qaGoogle: boolean }).__qaGoogle),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean((window as unknown as { __qaClarity: boolean }).__qaClarity),
      ),
    )
    .toBe(true);
});

test('refresh-only sessions recover across two tabs without rotating twice', async ({
  context,
  baseURL,
}) => {
  let refreshes = 0;
  const user = {
    id: 'qa-seller',
    firstName: 'QA',
    lastName: 'Seller',
    email: 'seller@example.com',
    phone: null,
    roles: ['seller'],
    emailVerifiedAt: new Date().toISOString(),
  };
  await context.addCookies([
    { name: 'tlk_refresh', value: 'qa-refresh', url: baseURL!, httpOnly: true },
  ]);
  await context.addInitScript(
    (user) => localStorage.setItem('throttlelk_user', JSON.stringify(user)),
    user,
  );
  await context.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fulfill({
        json: { success: true, data: { user } },
        headers: {
          'Set-Cookie': 'tlk_access=refreshed; Path=/; HttpOnly; SameSite=Lax',
        },
      });
      return;
    }
    if (
      !(route.request().headers().cookie ?? '').includes('tlk_access=refreshed')
    ) {
      await route.fulfill({
        status: 401,
        json: { success: false, error: { code: 'UNAUTHORIZED' } },
      });
      return;
    }
    const data = path.endsWith('/users/me')
      ? user
      : path.endsWith('/promotions/mine')
        ? { pending: [], live: [] }
        : path.includes('/quota/')
          ? {
              audience: 'private',
              free: 5,
              purchased: 0,
              used: 0,
              remaining: 5,
            }
          : [];
    await route.fulfill({
      json: {
        success: true,
        data,
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    });
  });
  const first = await context.newPage();
  const second = await context.newPage();
  await Promise.all([
    first.goto('/en/account/listings'),
    second.goto('/en/account/listings'),
  ]);
  await expect.poll(() => refreshes).toBe(1);
  await expect(
    first.getByRole('heading', { name: 'My listings', exact: true }),
  ).toBeVisible();
  await expect(
    second.getByRole('heading', { name: 'My listings', exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      (await context.cookies()).some(
        (c) => c.name === 'tlk_access' && c.value === 'refreshed',
      ),
    )
    .toBe(true);
  expect(refreshes).toBe(1);
});
