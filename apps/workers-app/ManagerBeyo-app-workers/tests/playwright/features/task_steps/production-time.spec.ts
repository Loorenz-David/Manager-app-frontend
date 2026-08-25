import { hasPlaywrightCredentials, expect, test } from "../../fixtures/app-fixture";
import { press } from "../../helpers/press";
import { stubReassignedStepsEndpoints } from "../../helpers/reassigned-steps-stubs";

test.skip(
  !hasPlaywrightCredentials(),
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

test("task detail renders the production-time projection above the flow timeline", async ({
  page,
  auth,
}) => {
  await stubReassignedStepsEndpoints(page, { pageSize: 2 });
  let productionTimeRequests = 0;

  await page.route(
    "**/api/v1/item-economics/tasks/*/production-time",
    (route) => {
      productionTimeRequests += 1;
      const taskId = new URL(route.request().url()).pathname.split("/").at(-2);
      const enteredAt = new Date(Date.now() - 10 * 60 * 1_000).toISOString();

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            task_id: taskId,
            status: "ok",
            item_binding: "bound",
            allocation_method: "static_proportional_section_v1",
            pressure_ratio: "0.75",
            pressure_method: "open_share_proportional_v1",
            budget: {
              allowed_worker_minutes: "195.00",
              actual_worker_seconds: 9_600,
              actual_worker_minutes: "160.00",
              remaining_worker_minutes: "35.00",
              percent_consumed: "82.05",
            },
            final: null,
            sections: [
              {
                working_section_id: "wsec_upholstery",
                section_name: "upholstery installation",
                section_name_snapshot: "Upholstery installation",
                order_list: 7,
                state: "working",
                state_entered_at: enteredAt,
                worked_seconds: 1_500,
                step_count: 2,
                allowance_seconds: 3_600,
                pressure_share_seconds: 2_700,
                left_seconds: 2_100,
                share_state: "on_track",
                typical: {
                  typical_worker_seconds: 3_600,
                  sample_count: 23,
                  method: "median_completed_section_totals",
                  window_days: 90,
                  min_sample_size: 5,
                },
              },
              {
                working_section_id: "wsec_failed",
                section_name: "failed repair",
                section_name_snapshot: "Failed repair",
                order_list: 8,
                state: "working",
                state_entered_at: null,
                worked_seconds: 600,
                step_count: 1,
                allowance_seconds: 0,
                pressure_share_seconds: 0,
                left_seconds: -600,
                share_state: "over_share",
                typical: null,
              },
              {
                working_section_id: "wsec_deleted",
                section_name: null,
                section_name_snapshot: "Deleted polishing section",
                order_list: null,
                state: "completed",
                state_entered_at: null,
                worked_seconds: 900,
                step_count: 1,
                allowance_seconds: 1_200,
                pressure_share_seconds: null,
                left_seconds: 300,
                share_state: "on_track",
                typical: null,
              },
            ],
          },
        }),
      });
    },
  );

  await auth.signIn();
  await press(page, page.getByTestId("reassigned-card"));
  await expect(page.getByTestId("reassigned-steps-slide-page")).toBeVisible();
  await press(page, page.getByTestId(/^task-step-card-body-/).first());

  await expect(page.getByTestId("task-detail-slide-page")).toBeVisible({
    timeout: 6_000,
  });
  await expect(page.getByTestId("production-time-card")).toBeVisible({
    timeout: 6_000,
  });
  expect(productionTimeRequests).toBeGreaterThan(0);

  await expect(page.getByTestId("production-time-row-label")).toHaveText([
    "Upholstery installation",
    "Failed repair",
    "Deleted polishing section",
  ]);
  await expect(page.getByTestId("production-time-row-passes")).toHaveText(
    "2 passes",
  );

  const sectionOrder = await page
    .locator(
      '[data-testid="production-time-card"], [data-testid="task-detail-flow-section"]',
    )
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-testid")),
    );
  expect(sectionOrder).toEqual([
    "production-time-card",
    "task-detail-flow-section",
  ]);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
