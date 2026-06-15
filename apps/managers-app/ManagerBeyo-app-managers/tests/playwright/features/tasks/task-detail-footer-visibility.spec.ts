import { expect, test } from "../../fixtures/app-fixture";

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

test.describe("Task detail bottom actions visibility", () => {
  test("hides after 50px down-scroll and re-shows when scrolling up below 55px", async ({
    page,
    auth,
  }) => {
    test.skip(
      !hasCredentials,
      "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run",
    );

    await page.addInitScript(() => {
      (
        window as Window & { __BEYO_SCROLL_DEBUG__?: boolean }
      ).__BEYO_SCROLL_DEBUG__ = true;
    });

    const debugLogs: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "log") {
        return;
      }
      const text = msg.text();
      if (text.includes("[scroll-debug]")) {
        debugLogs.push(text);
      }
    });

    await auth.signIn();
    await expect(page.getByTestId("app-shell")).toBeVisible();

    await page.getByTestId("tab-tasks").click();
    await expect(page).toHaveURL(/\/tasks$/);
    const firstTaskBody = page
      .locator('[data-testid^="tasks-card-body-"]')
      .first();
    await expect(firstTaskBody).toBeVisible();
    await firstTaskBody.evaluate((element) => {
      (element as HTMLElement).click();
    });

    await expect(page.getByTestId("task-detail-slide")).toBeVisible({
      timeout: 10000,
    });

    const taskDetailSlide = page.getByTestId("task-detail-slide");
    const footer = taskDetailSlide.getByTestId("task-detail-bottom-actions");
    await expect(footer).toBeVisible();
    await expect(footer).toHaveClass(/translate-y-0/);

    const scrollContainer = taskDetailSlide.locator(".overflow-y-auto").first();
    await expect(scrollContainer).toBeVisible();

    const metrics = await scrollContainer.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollTop: element.scrollTop,
    }));

    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 50);

    // The hook intentionally suppresses initial scroll processing for a brief window.
    await page.waitForTimeout(180);

    const downMetrics = await scrollContainer.evaluate((element) => {
      element.scrollTo({ top: Number.MAX_SAFE_INTEGER, behavior: "auto" });
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
      return {
        scrollTop: element.scrollTop,
        maxScrollTop: element.scrollHeight - element.clientHeight,
      };
    });

    expect(downMetrics.scrollTop).toBeGreaterThan(50);

    await expect
      .poll(async () => (await footer.getAttribute("class")) ?? "")
      .toContain("translate-y-full");

    await scrollContainer.evaluate((element) => {
      element.scrollTo({ top: 54, behavior: "auto" });
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    await expect
      .poll(async () => (await footer.getAttribute("class")) ?? "")
      .toContain("translate-y-0");

    const stateLogCount = debugLogs.filter((line) =>
      line.includes("[scroll-debug][state]"),
    ).length;
    expect(stateLogCount).toBeGreaterThan(0);
  });
});
