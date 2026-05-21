import { test, expect } from '../../fixtures/app-fixture';

test.describe('Sign-in page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in');
  });

  test('renders form at mobile viewport without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/sign-in');

    await expect(page.getByTestId('auth-email-input')).toBeVisible();
    await expect(page.getByTestId('auth-password-input')).toBeVisible();
    await expect(page.getByTestId('auth-sign-in-button')).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('shows field validation errors on empty submit', async ({ page }) => {
    await page.getByTestId('auth-sign-in-button').click();

    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
  });

  test('shows root error when server returns 403', async ({ page }) => {
    await page.route('**/api/v1/auth/sign-in', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials.', ok: false }),
      }),
    );

    await page.getByTestId('auth-email-input').fill('test@example.com');
    await page.getByTestId('auth-password-input').fill('wrongpassword');
    await page.getByTestId('auth-sign-in-button').click();

    await expect(page.getByTestId('auth-error-root')).toBeVisible();
    await expect(page.getByTestId('auth-error-root')).toContainText('Invalid credentials.');
  });

  test('shows rate-limit error when server returns 429', async ({ page }) => {
    await page.route('**/api/v1/auth/sign-in', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Rate limit exceeded. Please wait before retrying.' }),
      }),
    );

    await page.getByTestId('auth-email-input').fill('test@example.com');
    await page.getByTestId('auth-password-input').fill('anypassword');
    await page.getByTestId('auth-sign-in-button').click();

    await expect(page.getByTestId('auth-error-root')).toBeVisible();
    await expect(page.getByTestId('auth-error-root')).toContainText('Rate limit exceeded');
  });

  test('sends correct request body including app_scope', async ({ page }) => {
    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/api/v1/auth/sign-in') && req.method() === 'POST',
    );

    await page.route('**/api/v1/auth/sign-in', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials.', ok: false }),
      }),
    );

    await page.getByTestId('auth-email-input').fill('user@example.com');
    await page.getByTestId('auth-password-input').fill('password123');
    await page.getByTestId('auth-sign-in-button').click();

    const req = await requestPromise;
    expect(req.postDataJSON()).toMatchObject({
      email: 'user@example.com',
      password: 'password123',
      app_scope: 'admin',
    });
  });

  test('disables form and shows loading text while request is in flight', async ({ page }) => {
    let resolveDelay!: () => void;

    await page.route('**/api/v1/auth/sign-in', async (route) => {
      await new Promise<void>((resolve) => {
        resolveDelay = resolve;
      });
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials.', ok: false }),
      });
    });

    await page.getByTestId('auth-email-input').fill('test@example.com');
    await page.getByTestId('auth-password-input').fill('password');
    await page.getByTestId('auth-sign-in-button').click();

    await expect(page.getByTestId('auth-sign-in-button')).toBeDisabled();
    await expect(page.getByTestId('auth-sign-in-button')).toContainText('Signing in…');

    resolveDelay();

    await expect(page.getByTestId('auth-sign-in-button')).toBeEnabled();
  });

  test('redirects to home on successful sign-in', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_TEST_EMAIL;
    const password = process.env.PLAYWRIGHT_TEST_PASSWORD;
    test.skip(!email || !password, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run');

    await page.getByTestId('auth-email-input').fill(email!);
    await page.getByTestId('auth-password-input').fill(password!);
    await page.getByTestId('auth-sign-in-button').click();

    await page.waitForURL('/');
    await expect(page).not.toHaveURL('/sign-in');
  });
});
