# Playwright — Runtime Validation

End-to-end tests for the ManagerBeyo Managers app. Validates real browser behavior: DOM rendering, network requests, form interactions, optimistic updates, and responsive layout.

---

## Setup

### 1. Install browsers (first time only)

```bash
npx playwright install
```

### 2. Set test credentials (for sign-in tests)

Create a `.env.test` file in the app root or export in your shell:

```bash
export PLAYWRIGHT_TEST_EMAIL=your@email.com
export PLAYWRIGHT_TEST_PASSWORD=yourpassword
```

Tests that require a real authenticated session skip automatically if these are not set.

### 3. Make sure the dev server is running

```bash
npm run dev
```

Playwright reuses an existing server on `localhost:5173` automatically. If it is not running, it starts one.

---

## Commands

### Run headless (CI / quick check)

```bash
npm run test:e2e              # all tests, both mobile and desktop
npm run test:e2e:mobile       # mobile project only  (390×844, touch UA)
npm run test:e2e:desktop      # desktop project only (1440×900)
```

Always run mobile first — it is the primary target.

### Run with visual browser window

```bash
npm run test:e2e:headed       # opens a real browser, runs mobile tests
```

The browser window opens and you watch the test execute step by step. No extra interface. Good for a quick sanity check.

### Interactive UI mode

```bash
npm run test:e2e:ui
```

Opens the Playwright UI app. Left panel: test tree. Right panel: live browser preview.

What you can do in UI mode:
- Pick a single test or a whole file and run it
- Watch the browser execute each action in real time
- Step forward and backward through actions
- Inspect DOM snapshots at every step
- See all network requests and responses
- Read console output per action

This is the primary tool for debugging and exploration.

### View the last run report

```bash
npm run test:e2e:report
```

Opens the HTML report from the most recent headless run. Shows pass/fail per test, screenshots on failure, and a **trace viewer** for every failed test — full DOM snapshot timeline, network tab, console tab.

---

## Recommended flow

### Developing a new feature

1. Implement the feature (types → API → components → page)
2. Add `data-testid` to all feature-critical elements during the component step
3. Write the spec in `features/<feature>/<flow>.spec.ts`
4. Run `npm run test:e2e:ui` to develop and debug the spec interactively
5. Once passing in UI mode, run `npm run test:e2e:mobile` headless to confirm
6. Run `npm run test:e2e:desktop` to confirm on desktop
7. Feature is complete only when both pass

### Debugging a failure

1. Run `npm run test:e2e:ui` and select the failing test
2. Watch the browser — look at where the assertion fails
3. Use the DOM snapshot timeline to inspect the page state at failure
4. Check the network tab for unexpected responses
5. Check the console tab for errors

If the failure happened in CI and you cannot reproduce locally:

1. Run `npm run test:e2e:report` after downloading the CI artifacts
2. Open the trace viewer for the failed test — it shows every action, DOM snapshot, and network request from the CI run

### Running a single spec file

```bash
npx playwright test tests/playwright/features/auth/sign-in.spec.ts --project=mobile
```

### Running a single test by name

```bash
npx playwright test --grep "shows root error" --project=mobile
```

---

## Project structure

```
tests/playwright/
  fixtures/
    app-fixture.ts        ← base test: console error interception + auth fixture
    auth-fixture.ts       ← AuthHelper.signIn() via real backend
  helpers/
    assert-drawer.ts      ← drawer open / gesture dismiss
    assert-modal.ts       ← modal open / backdrop / Escape key
    assert-optimistic.ts  ← withDelayedRoute: delay a request to observe optimistic state
    assert-network.ts     ← waitForApiRequest, assertNoUnexpectedErrors
  features/
    auth/
      sign-in.spec.ts
```

---

## Writing a spec

Always import `test` and `expect` from the app fixture — never from `@playwright/test` directly. The app fixture wires console error interception automatically.

```ts
import { test, expect } from '../../fixtures/app-fixture';
```

For tests that need an authenticated session:

```ts
test('my feature test', async ({ page, auth }) => {
  await auth.signIn();
  await page.goto('/tasks');
  // ...
});
```

For tests that mock an API response:

```ts
await page.route('**/api/v1/tasks', (route) =>
  route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Server error.', ok: false }),
  }),
);
```

For tests that need to observe optimistic state before a response arrives:

```ts
import { withDelayedRoute } from '../../helpers/assert-optimistic';

const { resolve } = await withDelayedRoute(page, '**/api/v1/tasks/**', 'PATCH', async () => {
  await page.getByTestId('task-mark-done-button').click();
});

await expect(page.getByTestId('task-list-row').first()).toContainText('Done');
resolve();
```

---

## Rules

- Uncaught JavaScript exceptions (`pageerror`) and application `console.error` calls automatically fail the test
- `"Failed to load resource"` messages are filtered — Chromium logs every non-2xx `fetch()` response at the browser level, including expected 401/403/429 error-path responses. These are not application errors. Real errors (React failures, uncaught exceptions) are caught via `pageerror`.
- Use `data-testid` for all selectors — never class names, text content, or DOM structure
- Never use `page.waitForTimeout(N)` — use `waitForURL`, `waitForResponse`, `waitForSelector`, or assertion retries
- Run mobile first — desktop is the secondary validation
- A feature is not complete until both mobile and desktop pass
