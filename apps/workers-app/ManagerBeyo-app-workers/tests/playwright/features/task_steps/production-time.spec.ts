import { hasPlaywrightCredentials, expect, test } from "../../fixtures/app-fixture";
import { press } from "../../helpers/press";
import { stubReassignedStepsEndpoints } from "../../helpers/reassigned-steps-stubs";

test.skip(
  !hasPlaywrightCredentials(),
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

test("worker task detail does not render the production-time projection", async ({
  page,
  auth,
}) => {
  await stubReassignedStepsEndpoints(page, { pageSize: 2 });
  let productionTimeRequests = 0;

  await page.route(
    "**/api/v1/item-economics/tasks/*/production-time",
    (route) => {
      productionTimeRequests += 1;
      return route.continue();
    },
  );

  await auth.signIn();
  await press(page, page.getByTestId("reassigned-card"));
  await expect(page.getByTestId("reassigned-steps-slide-page")).toBeVisible();
  await press(page, page.getByTestId(/^task-step-card-body-/).first());

  await expect(page.getByTestId("task-detail-slide-page")).toBeVisible({
    timeout: 6_000,
  });
  await expect(page.getByTestId("task-detail-flow-section")).toBeVisible({
    timeout: 6_000,
  });
  await expect(page.getByTestId("production-time-card")).toHaveCount(0);
  expect(productionTimeRequests).toBe(0);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
