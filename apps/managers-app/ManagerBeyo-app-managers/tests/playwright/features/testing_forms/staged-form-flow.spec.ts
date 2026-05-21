import type { Page } from '@playwright/test';

import type { AuthHelper } from '../../fixtures/auth-fixture';
import { expect, test } from '../../fixtures/app-fixture';

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

async function openTestingForms(page: Page, auth: AuthHelper) {
  await auth.signIn();
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await page.getByTestId('tab-tasks').click();
  await expect(page).toHaveURL(/\/tasks$/);
  const openButton = page.locator('[data-testid="open-testing-forms-button"]:visible');
  await expect(openButton).toHaveCount(1);
  await openButton.click();
  await expect(page.getByTestId('testing-forms-form')).toBeVisible();
}

async function completeMinimalItemStep(page: Page) {
  await page.getByTestId('item-quantity-input').fill('1');
  await page.getByTestId('item-currency-input').selectOption('swedish_krona');
}

async function completeMinimalCustomerStep(page: Page) {
  await page.getByTestId('customer-display-name-input').fill('Jane Example');
  await page.getByTestId('customer-type-input').selectOption('person');
}

test.describe('Staged form flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page, auth }) => {
    test.skip(!hasCredentials, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run');
    await openTestingForms(page, auth);
  });

  test('renders timeline and all step indicators', async ({ page }) => {
    await expect(page.getByTestId('staged-form-timeline')).toBeVisible();
    await expect(page.getByTestId('staged-form-step-item-indicator')).toBeVisible();
    await expect(page.getByTestId('staged-form-step-customer-indicator')).toBeVisible();
    await expect(page.getByTestId('staged-form-step-task-indicator')).toBeVisible();
    await expect(page.getByTestId('staged-form-advance-button')).toBeVisible();
    await expect(page.getByTestId('staged-form-back-button')).toBeVisible();
  });

  test('advances to step 2 and marks step 1 completed', async ({ page }) => {
    await completeMinimalItemStep(page);
    await page.getByTestId('staged-form-advance-button').click();

    await expect(page.getByTestId('staged-form-step-customer')).toBeVisible();
    await expect(page.getByTestId('staged-form-step-customer-indicator')).toHaveAttribute(
      'aria-current',
      'step',
    );
    await expect(page.getByTestId('staged-form-step-item-indicator')).toHaveAttribute(
      'data-status',
      'completed',
    );
  });

  test('returns to step 1 with back navigation', async ({ page }) => {
    await completeMinimalItemStep(page);
    await page.getByTestId('staged-form-advance-button').click();
    await page.getByTestId('staged-form-back-button').click();

    await expect(page.getByTestId('staged-form-step-item')).toBeVisible();
    await expect(page.getByTestId('staged-form-step-item-indicator')).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  test('supports free navigation from the timeline', async ({ page }) => {
    await page.getByTestId('staged-form-step-customer-indicator').click();

    await expect(page.getByTestId('staged-form-step-customer')).toBeVisible();
    await expect(page.getByTestId('customer-field-group')).toBeVisible();
  });

  test('submits from the last step without runtime errors', async ({ page }) => {
    await completeMinimalItemStep(page);
    await page.getByTestId('staged-form-advance-button').click();
    await completeMinimalCustomerStep(page);
    await page.getByTestId('staged-form-advance-button').click();

    await expect(page.getByTestId('staged-form-step-task')).toBeVisible();
    await page.getByTestId('task-fulfillment-method-delivery-option').click();
    await page.getByTestId('task-return-source-store-return-option').click({ force: true });
    await page.getByTestId('staged-form-advance-button').click();

    await expect(page.getByTestId('staged-form-step-task')).toBeVisible();
    await expect(page.getByTestId('staged-form-advance-button')).toContainText('Submit');
  });

  test('keeps back hidden and non-interactable on the first step', async ({ page }) => {
    const backButton = page.getByTestId('staged-form-back-button');

    await expect(backButton).toHaveClass(/opacity-0/);
    await expect(backButton).toBeDisabled();
  });
});
