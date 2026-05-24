import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/app-fixture';

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

test.describe('Task creation staged forms', () => {
  test.beforeEach(async ({ page, auth }) => {
    test.skip(!hasCredentials, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run');

    await auth.signIn();
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await page.getByTestId('tab-tasks').click();
    await expect(page).toHaveURL(/\/tasks$/);
  });

  async function openTaskCreationForm(page: Page, formType: 'pre_order' | 'return') {
    await page.getByTestId('task-creation-fab').click();
    await page.getByTestId(`task-creation-fab-action-${formType}`).click();
  }

  async function completeItemStep(page: Page) {
    await expect(page.getByTestId('staged-form-advance-button')).toBeVisible();
    await page.getByTestId('item-article-number-input').fill('ABC-123');
    await page.getByTestId('staged-form-advance-button').click();
    await expect(page.getByTestId('staged-form-step-customer')).toBeVisible();
  }

  async function completeItemStepWithIssue(page: Page) {
    await expect(page.getByTestId('staged-form-advance-button')).toBeVisible();
    await page.getByTestId('item-article-number-input').fill('ABC-123');
    await page.getByTestId('item-major-category-wood-option').click();
    await expect(page.getByTestId('item-category-picker-sheet')).toBeVisible();
    await page.getByTestId('item-category-cat_wood_table-option').click();
    await expect(page.getByTestId('item-category-picker-sheet')).not.toBeVisible();
    await page.getByTestId('item-issue-issue_scratches-option').click();
    await page.getByTestId('staged-form-advance-button').click();
    await expect(page.getByTestId('staged-form-step-customer')).toBeVisible();
  }

  async function completeCustomerStep(page: Page) {
    await page.getByTestId('customer-display-name-input').fill('Jane Example');
    await page.getByTestId('customer-type-input').selectOption('person');
    await page.getByTestId('staged-form-advance-button').click();
  }

  test('pre-order form advances past customer step when all visible required fields are filled', async ({
    page,
  }) => {
    await openTaskCreationForm(page, 'pre_order');
    await expect(page.getByTestId('pre-order-form')).toBeVisible();

    await completeItemStep(page);
    await completeCustomerStep(page);

    await expect(page.getByTestId('staged-form-step-task')).toBeVisible();
  });

  test('return form advances past customer step when all visible required fields are filled', async ({
    page,
  }) => {
    await openTaskCreationForm(page, 'return');
    await expect(page.getByTestId('return-form')).toBeVisible();

    await completeItemStep(page);
    await completeCustomerStep(page);

    await expect(page.getByTestId('staged-form-step-task')).toBeVisible();
  });

  test('pre-order form still advances after selecting an item issue', async ({ page }) => {
    await openTaskCreationForm(page, 'pre_order');
    await expect(page.getByTestId('pre-order-form')).toBeVisible();

    await completeItemStepWithIssue(page);
    await completeCustomerStep(page);

    await expect(page.getByTestId('staged-form-step-task')).toBeVisible();
  });

  test('return form still advances after selecting an item issue', async ({ page }) => {
    await openTaskCreationForm(page, 'return');
    await expect(page.getByTestId('return-form')).toBeVisible();

    await completeItemStepWithIssue(page);
    await completeCustomerStep(page);

    await expect(page.getByTestId('staged-form-step-task')).toBeVisible();
  });
});
