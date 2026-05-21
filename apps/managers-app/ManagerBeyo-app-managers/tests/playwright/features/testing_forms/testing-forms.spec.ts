import type { Page } from '@playwright/test';

import type { AuthHelper } from '../../fixtures/auth-fixture';
import { test, expect } from '../../fixtures/app-fixture';

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

async function selectFirstCalendarDay(page: Page, scopeTestId: string) {
  const calendar = page.getByTestId(scopeTestId);
  const firstDay = calendar.getByRole('button', { name: /20\d{2}/ }).first();
  await firstDay.click();
}

test.describe('Testing forms surface', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page, auth }) => {
    test.skip(!hasCredentials, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run');
    await openTestingForms(page, auth);
  });

  test('renders all field groups and key selectors', async ({ page }) => {
    await expect(page.getByTestId('customer-field-group')).toBeVisible();
    await expect(page.getByTestId('customer-display-name-input')).toBeVisible();
    await expect(page.getByTestId('customer-type-input')).toBeVisible();
    await expect(page.getByTestId('customer-email-input')).toBeVisible();
    await expect(page.getByTestId('customer-phone-input')).toBeVisible();
    await expect(page.getByTestId('customer-address-street-input')).toBeVisible();
    await expect(page.getByTestId('customer-address-city-input')).toBeVisible();
    await expect(page.getByTestId('customer-address-postal-code-input')).toBeVisible();
    await expect(page.getByTestId('customer-address-country-input')).toBeVisible();

    await expect(page.getByTestId('item-details-field-group')).toBeVisible();
    await expect(page.getByTestId('item-designer-input')).toBeVisible();
    await expect(page.getByTestId('item-article-number-input')).toBeVisible();
    await expect(page.getByTestId('item-sku-input')).toBeVisible();
    await expect(page.getByTestId('item-quantity-input')).toBeVisible();
    await expect(page.getByTestId('item-currency-input')).toBeVisible();
    await expect(page.getByTestId('item-position-input')).toBeVisible();
    await expect(page.getByTestId('item-category-selection-field')).toBeVisible();
    await expect(page.getByTestId('item-issues-field')).toBeVisible();

    await expect(page.getByTestId('task-fulfillment-method-field')).toBeVisible();
    await expect(page.getByTestId('task-return-source-field')).toBeVisible();
    await expect(page.getByTestId('task-ready-by-date-field')).toBeVisible();
    await expect(page.getByTestId('task-delivery-date-field')).toBeVisible();
    await expect(page.getByTestId('testing-forms-submit-button')).toBeVisible();
  });

  test('accepts direct customer and item input values', async ({ page }) => {
    await page.getByTestId('customer-display-name-input').fill('Jane Example');
    await page.getByTestId('customer-type-input').selectOption('person');
    await page.getByTestId('customer-email-input').fill('jane@example.com');
    await page.getByTestId('customer-phone-input').fill('+46701234567');
    await page.getByTestId('customer-address-street-input').fill('Main Street 1');
    await page.getByTestId('customer-address-city-input').fill('Stockholm');
    await page.getByTestId('customer-address-postal-code-input').fill('11122');
    await page.getByTestId('customer-address-country-input').fill('Sweden');

    await page.getByTestId('item-designer-input').fill('Svenskt Tenn');
    await page.getByTestId('item-article-number-input').fill('ART-100');
    await page.getByTestId('item-sku-input').fill('SKU-100');
    await page.getByTestId('item-quantity-input').fill('2');
    await page.getByTestId('item-currency-input').selectOption('swedish_krona');
    await page.getByTestId('item-position-input').fill('Front showroom');

    await expect(page.getByTestId('customer-display-name-input')).toHaveValue('Jane Example');
    await expect(page.getByTestId('customer-type-input')).toHaveValue('person');
    await expect(page.getByTestId('customer-email-input')).toHaveValue('jane@example.com');
    await expect(page.getByTestId('customer-phone-input')).toHaveValue('+46701234567');
    await expect(page.getByTestId('customer-address-street-input')).toHaveValue('Main Street 1');
    await expect(page.getByTestId('customer-address-city-input')).toHaveValue('Stockholm');
    await expect(page.getByTestId('customer-address-postal-code-input')).toHaveValue('11122');
    await expect(page.getByTestId('customer-address-country-input')).toHaveValue('Sweden');

    await expect(page.getByTestId('item-designer-input')).toHaveValue('Svenskt Tenn');
    await expect(page.getByTestId('item-article-number-input')).toHaveValue('ART-100');
    await expect(page.getByTestId('item-sku-input')).toHaveValue('SKU-100');
    await expect(page.getByTestId('item-quantity-input')).toHaveValue('2');
    await expect(page.getByTestId('item-currency-input')).toHaveValue('swedish_krona');
    await expect(page.getByTestId('item-position-input')).toHaveValue('Front showroom');
  });

  test('supports task box pickers and calendar flows', async ({ page }) => {
    await page.getByTestId('task-fulfillment-method-delivery-option').click();
    await expect(page.getByTestId('task-fulfillment-method-delivery-option')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByTestId('task-return-source-store-return-option').click();
    await expect(page.getByTestId('task-return-source-store-return-option')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByTestId('task-ready-by-date-input').click();
    await expect(page.getByTestId('calendar-single-picker-page')).toBeVisible();
    await selectFirstCalendarDay(page, 'calendar-single-picker-page');
    await expect(page.getByTestId('calendar-single-picker-page')).not.toBeVisible();
    await expect(page.getByTestId('task-ready-by-date-input')).not.toContainText('Select due date');

    await page.getByTestId('task-delivery-date-input').click();
    await expect(page.getByTestId('calendar-range-picker-page')).toBeVisible();
    const rangeButtons = page
      .getByTestId('calendar-range-picker-page')
      .getByRole('button', { name: /20\d{2}/ });
    await rangeButtons.first().click();
    await expect(page.getByTestId('date-range-to-tab')).toHaveAttribute('aria-selected', 'true');
    await rangeButtons.nth(6).click();
    await expect(page.getByTestId('calendar-range-picker-page')).not.toBeVisible();
    await expect(page.getByTestId('task-delivery-date-input')).not.toContainText('Start date');
    await expect(page.getByTestId('task-delivery-date-input')).not.toContainText('End date');
  });

  test('supports item category selection flow', async ({ page }) => {
    await page.getByTestId('item-major-category-wood-option').click();
    await expect(page.getByTestId('item-category-picker-sheet')).toBeVisible();
    await page.getByTestId('item-category-cat_wood_table-option').click();
    await expect(page.getByTestId('item-category-picker-sheet')).not.toBeVisible();
    await expect(page.getByTestId('item-category-selected-trigger')).toContainText('Table');

    await page.getByTestId('item-major-category-seat-option').click();
    await expect(page.getByTestId('item-category-picker-sheet')).toBeVisible();
    await page.getByTestId('item-category-cat_seat_sofa-option').click();
    await expect(page.getByTestId('item-category-selected-trigger')).toContainText('Sofa');

    await page.getByTestId('item-category-selected-trigger').click();
    await expect(page.getByTestId('item-category-picker-sheet')).toBeVisible();
  });

  test('supports item issue severity selection, reselection, and removal', async ({ page }) => {
    await page.getByTestId('item-issue-issue_scratches-option').click();
    await expect(page.getByTestId('item-issue-severity-picker-sheet')).toBeVisible();
    await page.getByTestId('item-issue-severity-severity_medium-option').click();
    await expect(page.getByTestId('item-issue-severity-picker-sheet')).not.toBeVisible();
    await expect(page.getByTestId('item-issue-issue_scratches-option')).toContainText(
      'Scratches · Medium',
    );

    await page.getByTestId('item-issue-issue_scratches-option').click();
    await expect(page.getByTestId('item-issue-severity-picker-sheet')).toBeVisible();
    await page.getByTestId('item-issue-severity-severity_high-option').click();
    await expect(page.getByTestId('item-issue-issue_scratches-option')).toContainText(
      'Scratches · High',
    );

    await page.getByTestId('item-issue-issue_scratches-remove-button').click();
    await expect(page.getByTestId('item-issue-issue_scratches-remove-button')).toHaveCount(0);
    await expect(page.getByTestId('item-issue-issue_scratches-option')).toContainText('Scratches');
  });
});
