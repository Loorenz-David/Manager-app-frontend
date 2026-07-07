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

  async function openTaskCreationForm(
    page: Page,
    formType: 'internal' | 'pre_order' | 'return',
  ) {
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

  async function scrollToBottomWithoutReversing(page: Page) {
    const scrollContainer = page.getByTestId('staged-form-scroll-container');
    const metrics = await scrollContainer.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    if (metrics.scrollHeight <= metrics.clientHeight) {
      test.skip(true, 'Current step is not scrollable in this fixture');
      return;
    }

    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(250);
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

  test('internal task footer reveals at the bottom edge and hides again after scrolling back up', async ({
    page,
  }) => {
    await openTaskCreationForm(page, 'internal');
    await expect(page.getByTestId('internal-form')).toBeVisible();

    const timeline = page.getByTestId('staged-form-timeline');
    const scrollContainer = page.getByTestId('staged-form-scroll-container');
    const footer = page.getByTestId('staged-form-footer');

    await expect(timeline).toHaveAttribute('data-compact', 'false');
    await expect(footer).toHaveClass(/pointer-events-none/);

    await scrollToBottomWithoutReversing(page);
    await expect(timeline).toHaveAttribute('data-compact', 'false');
    await expect(footer).not.toHaveClass(/pointer-events-none/);

    await scrollContainer.evaluate((el) => {
      el.scrollTop = Math.max(0, el.scrollTop - 80);
    });
    await page.waitForTimeout(250);

    await expect(timeline).toHaveAttribute('data-compact', 'false');
    await expect(footer).toHaveClass(/pointer-events-none/);
  });
});
