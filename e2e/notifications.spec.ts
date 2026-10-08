import {
  test,
  expect,
  type BrowserContext,
  type Route,
} from '@playwright/test';

type Alert = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  dataJson: Record<string, string> | null;
};
const defaults = {
  email: true,
  inApp: true,
  messages: true,
  listings: true,
  shops: true,
  promotions: true,
  savedSearches: true,
};

async function mockNotifications(
  context: BrowserContext,
  baseURL: string,
  count = 30,
) {
  const user = {
    id: 'qa-notification-user',
    firstName: 'QA',
    lastName: 'Seller',
    email: 'qa@example.test',
    phone: null,
    roles: ['seller', 'admin'],
    emailVerifiedAt: new Date().toISOString(),
  };
  await context.addCookies([
    { name: 'tlk_access', value: 'qa-only', url: baseURL, httpOnly: true },
  ]);
  await context.addInitScript(
    (user) => localStorage.setItem('throttlelk_user', JSON.stringify(user)),
    user,
  );
  const state = {
    items: Array.from(
      { length: count },
      (_, i): Alert => ({
        id: `qa-alert-${i + 1}`,
        type: 'notice',
        title: `QA alert ${i + 1}`,
        message: 'Notification regression test',
        readAt: null,
        createdAt: new Date().toISOString(),
        dataJson: null,
      }),
    ),
    preferences: { ...defaults },
    fail: false,
    hold: false,
    pending: null as null | { route: Route; json: object },
    writes: [] as string[],
  };
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    let data: unknown = [];
    let meta = {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    if (path.endsWith('/users/me')) data = user;
    else if (path.endsWith('/notifications/preferences')) {
      if (request.method() === 'PATCH') {
        state.preferences = request.postDataJSON();
        state.writes.push(path);
      }
      data = state.preferences;
    } else if (path.endsWith('/notifications/unread-count'))
      data = { count: state.items.filter((n) => !n.readAt).length };
    else if (path.endsWith('/notifications/read-all')) {
      state.items.forEach((n) => {
        n.readAt = new Date().toISOString();
      });
      state.writes.push(path);
      data = { ok: true };
    } else if (/\/notifications\/[^/]+\/read$/.test(path)) {
      const row = state.items.find((n) => path.endsWith(`/${n.id}/read`));
      if (row) row.readAt = new Date().toISOString();
      state.writes.push(path);
      data = row;
    } else if (path.endsWith('/notifications')) {
      if (state.fail) {
        await route.fulfill({
          status: 503,
          json: {
            success: false,
            error: {
              code: 'QA_FAILURE',
              message: 'QA notification load failed',
            },
          },
        });
        return;
      }
      const rows = state.items.filter(
        (n) => url.searchParams.get('unread') !== '1' || !n.readAt,
      );
      const page = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      data = rows
        .slice((page - 1) * limit, page * limit)
        .map((row) => ({ ...row }));
      meta = {
        page,
        limit,
        total: rows.length,
        totalPages: Math.max(1, Math.ceil(rows.length / limit)),
        hasNextPage: page * limit < rows.length,
        hasPreviousPage: page > 1,
      };
      if (state.hold && url.searchParams.has('page')) {
        state.hold = false;
        state.pending = { route, json: { success: true, data, meta } };
        return;
      }
    } else if (path.endsWith('/promotions/mine'))
      data = { pending: [], live: [] };
    await route.fulfill({ json: { success: true, data, meta } });
  });
  return state;
}

test('unread pagination reaches older alerts and read-all updates page, header, and sidebar immediately', async ({
  page,
  context,
  baseURL,
}) => {
  await mockNotifications(context, baseURL!);
  await page.goto('/en/account/notifications');
  const main = page;
  await expect(
    page.getByRole('button', { name: '30 unread notifications', exact: true }),
  ).toBeVisible();
  await main.getByRole('tab', { name: 'Unread', exact: true }).click();
  await expect(
    main.getByRole('button', { name: /^QA alert 1 / }),
  ).toBeVisible();
  await main.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    main.getByRole('button', { name: /^QA alert 21 / }),
  ).toBeVisible();
  await expect(main.getByRole('button', { name: /^QA alert 1 / })).toHaveCount(
    0,
  );
  await main
    .getByRole('button', { name: 'Mark all read', exact: true })
    .click();
  await expect(
    main.getByText('No unread items.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Notifications', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: 'Notifications. 30 unread notifications',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    main.getByRole('button', { name: 'Mark all read', exact: true }),
  ).toBeDisabled();
});

test('reading in one tab refreshes notification counts in another tab', async ({
  context,
  baseURL,
}) => {
  await mockNotifications(context, baseURL!, 2);
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto('/en/account/notifications');
  await second.goto('/en/account/notifications');
  await expect(
    second.getByRole('button', { name: '2 unread notifications', exact: true }),
  ).toBeVisible();
  await first.bringToFront();
  await first
    .getByRole('button', { name: 'Mark all read', exact: true })
    .click();
  await second.bringToFront();
  await expect(
    second.getByRole('button', { name: 'Notifications', exact: true }),
  ).toBeVisible();
  await expect(
    second.getByRole('button', { name: 'Mark all read', exact: true }),
  ).toBeDisabled();
});

test('a successful refresh clears the previous notification load error', async ({
  page,
  context,
  baseURL,
}) => {
  const state = await mockNotifications(context, baseURL!, 2);
  state.fail = true;
  await page.goto('/en/account/notifications');
  await expect(
    page.getByRole('alert').filter({ hasText: 'QA notification load failed' }),
  ).toContainText('QA notification load failed');
  state.fail = false;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(
    page.getByRole('button', { name: /^QA alert 1 / }),
  ).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: 'QA notification load failed' }),
  ).toHaveCount(0);
});

test('a delayed refresh cannot restore stale unread rows after read-all', async ({
  page,
  context,
  baseURL,
}) => {
  const state = await mockNotifications(context, baseURL!, 2);
  await page.goto('/en/account/notifications');
  const main = page;
  await main.getByRole('tab', { name: 'Unread', exact: true }).click();
  await expect(
    main.getByRole('button', { name: /^QA alert 1 / }),
  ).toBeVisible();
  state.hold = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => Boolean(state.pending)).toBe(true);
  await main
    .getByRole('button', { name: 'Mark all read', exact: true })
    .click();
  await expect(
    main.getByText('No unread items.', { exact: true }),
  ).toBeVisible();
  await state.pending!.route.fulfill({ json: state.pending!.json });
  await expect(main.getByRole('button', { name: /^QA alert / })).toHaveCount(0);
});

test('admin Review listing shortcut marks its notification read before navigation', async ({
  page,
  context,
  baseURL,
}) => {
  const state = await mockNotifications(context, baseURL!, 1);
  state.items[0].type = 'listing_pending_review';
  state.items[0].dataJson = { listingId: 'qa-bike' };
  await page.goto('/en/admin/moderation');
  await page
    .getByRole('button', { name: 'Notifications', exact: true })
    .click();
  await page.getByRole('link', { name: 'Review listing', exact: true }).click();
  await expect
    .poll(() => state.writes.includes('/api/v1/notifications/qa-alert-1/read'))
    .toBe(true);
  await expect(page).toHaveURL(/queue=listings/);
  expect(state.items[0].readAt).not.toBeNull();
});

test('notification preferences save and reload at a mobile viewport', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const state = await mockNotifications(context, baseURL!, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/account/profile');
  await expect(
    page.getByRole('heading', {
      name: 'Notification preferences',
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('checkbox', { name: 'Email alerts', exact: true })
    .uncheck();
  await page
    .getByRole('button', { name: 'Save preferences', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Notification preferences saved.',
  );
  expect(state.preferences.email).toBe(false);
  await page.reload();
  await expect(
    page.getByRole('checkbox', { name: 'Email alerts', exact: true }),
  ).not.toBeChecked();
  const bounds = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(bounds.content).toBeLessThanOrEqual(bounds.width);
  await page
    .getByRole('heading', { name: 'Notification preferences', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('notification-preferences-mobile.png'),
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  await expect(
    page.getByRole('checkbox', { name: 'Email alerts', exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole('button', { name: 'Save preferences', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('notification-preferences-desktop.png'),
  });
});

test('signed-out visitors see the sign-in link without a preferences loader', async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.goto('/en/account/profile');
  await expect(
    page.getByRole('link', { name: 'Sign In', exact: true }).last(),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Notification preferences',
      exact: true,
    }),
  ).toHaveCount(0);
});
