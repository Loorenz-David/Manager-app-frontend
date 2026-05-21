import type { Page } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async signIn(
    email = process.env.PLAYWRIGHT_TEST_EMAIL ?? '',
    password = process.env.PLAYWRIGHT_TEST_PASSWORD ?? '',
  ) {
    await this.page.goto('/sign-in');
    await this.page.getByTestId('auth-email-input').fill(email);
    await this.page.getByTestId('auth-password-input').fill(password);
    await this.page.getByTestId('auth-sign-in-button').click();
    await this.page.waitForURL('/');
  }
}
