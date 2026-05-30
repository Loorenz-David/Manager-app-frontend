# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: features/cases/cases-page.spec.ts >> cases page >> context banner collapses after the list scrolls and restores at the top
- Location: tests/playwright/features/cases/cases-page.spec.ts:1311:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('case-card-case_new_open')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - heading "Manager Beyo" [level=1] [ref=e7]
      - paragraph [ref=e8]: Sign in to your workspace
    - group [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: Email
        - textbox "Email" [ref=e15]
      - generic [ref=e16]:
        - generic [ref=e17]: Password
        - textbox "Password" [ref=e19]
      - button "Sign in" [ref=e20]
  - region "Notifications alt+T"
```

# Test source

```ts
  855  |           cases,
  856  |         },
  857  |       }),
  858  |     });
  859  |   });
  860  | 
  861  |   await page.route("**/api/v1/cases/unread-counts**", async (route) => {
  862  |     await route.fulfill({
  863  |       status: 200,
  864  |       contentType: "application/json",
  865  |       body: JSON.stringify({
  866  |         ok: true,
  867  |         warnings: [],
  868  |         data: {
  869  |           case_unread_counts: unreadCounts,
  870  |         },
  871  |       }),
  872  |     });
  873  |   });
  874  | 
  875  |   await page.route("**/api/v1/tasks/*", async (route) => {
  876  |     const taskId = new URL(route.request().url()).pathname
  877  |       .split("/")
  878  |       .at(-1) as keyof typeof taskDetails;
  879  | 
  880  |     if (options?.unavailableTaskIds?.includes(taskId)) {
  881  |       await route.fulfill({
  882  |         status: 404,
  883  |         contentType: "application/json",
  884  |         body: JSON.stringify({
  885  |           ok: false,
  886  |           error: "Task not found.",
  887  |         }),
  888  |       });
  889  |       return;
  890  |     }
  891  | 
  892  |     await route.fulfill({
  893  |       status: 200,
  894  |       contentType: "application/json",
  895  |       body: JSON.stringify({
  896  |         ok: true,
  897  |         warnings: [],
  898  |         data: taskDetails[taskId],
  899  |       }),
  900  |     });
  901  |   });
  902  | }
  903  | 
  904  | async function installCasesListWithoutTaskMocks(page: Page) {
  905  |   await page.route("**/api/v1/cases*", async (route) => {
  906  |     const url = new URL(route.request().url());
  907  | 
  908  |     if (url.pathname === "/api/v1/cases/unread-counts") {
  909  |       await route.fulfill({
  910  |         status: 200,
  911  |         contentType: "application/json",
  912  |         body: JSON.stringify({
  913  |           ok: true,
  914  |           warnings: [],
  915  |           data: {
  916  |             case_unread_counts: {},
  917  |           },
  918  |         }),
  919  |       });
  920  |       return;
  921  |     }
  922  | 
  923  |     await route.fulfill({
  924  |       status: 200,
  925  |       contentType: "application/json",
  926  |       body: JSON.stringify({
  927  |         ok: true,
  928  |         warnings: [],
  929  |         data: {
  930  |           cases: [
  931  |             {
  932  |               client_id: "case_live_shape_without_task",
  933  |               created_at: new Date(Date.now() - 3 * DAY_MS).toISOString(),
  934  |               state: "open",
  935  |               case_type_id: null,
  936  |               type_label: "ClientId Case",
  937  |               participant_count: 0,
  938  |               messages_count: 1,
  939  |               created_by: {
  940  |                 client_id: "usr_user_test",
  941  |                 username: "user_test",
  942  |                 profile_picture: "https://example.com/users/me_1778870851.png",
  943  |               },
  944  |               entity_type: null,
  945  |               last_message_seq: 1,
  946  |             },
  947  |           ],
  948  |         },
  949  |       }),
  950  |     });
  951  |   });
  952  | }
  953  | 
  954  | async function openCase(page: Page, caseId: string) {
> 955  |   await page.getByTestId(`case-card-${caseId}`).click();
       |                                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  956  |   await expect(page.getByTestId("case-conversation-slide")).toBeVisible();
  957  | }
  958  | 
  959  | test.describe("cases page", () => {
  960  |   test.beforeEach(async ({ auth }) => {
  961  |     await auth.signIn();
  962  |   });
  963  | 
  964  |   test("renders groups, filters client-side, shows unread badge, and opens the conversation shell", async ({
  965  |     page,
  966  |   }) => {
  967  |     await installCasesMocks(page);
  968  | 
  969  |     await page.goto("/cases");
  970  | 
  971  |     await expect(page.getByTestId("cases-page")).toBeVisible();
  972  |     await expect(
  973  |       page
  974  |         .getByTestId("cases-section-new")
  975  |         .getByTestId("case-card-case_new_open"),
  976  |     ).toBeVisible();
  977  |     await expect(
  978  |       page
  979  |         .getByTestId("cases-section-active")
  980  |         .getByTestId("case-card-case_active_open"),
  981  |     ).toBeVisible();
  982  |     await expect(
  983  |       page
  984  |         .getByTestId("cases-section-resolving")
  985  |         .getByTestId("case-card-case_resolving"),
  986  |     ).toBeVisible();
  987  | 
  988  |     await expect(
  989  |       page
  990  |         .getByTestId("cases-section-active")
  991  |         .getByTestId("case-card-case_new_open"),
  992  |     ).toHaveCount(0);
  993  |     await expect(page.getByTestId("case-card-unread-case_new_open")).toHaveText(
  994  |       "3",
  995  |     );
  996  | 
  997  |     await page.getByTestId("cases-search-bar-input").fill("bob");
  998  |     await expect(
  999  |       page
  1000 |         .getByTestId("cases-section-active")
  1001 |         .getByTestId("case-card-case_active_open"),
  1002 |     ).toBeVisible();
  1003 |     await expect(page.getByTestId("case-card-case_new_open")).toHaveCount(0);
  1004 |     await expect(page.getByTestId("case-card-case_resolving")).toHaveCount(0);
  1005 | 
  1006 |     await page.getByTestId("cases-search-bar-input").fill("");
  1007 |     await openCase(page, "case_new_open");
  1008 |     await expect(page).toHaveURL(/\/cases\/case_new_open$/);
  1009 | 
  1010 |     await expect(page.getByTestId("case-conversation-header")).toBeVisible();
  1011 |     await expect(
  1012 |       page.getByTestId("case-conversation-context-banner"),
  1013 |     ).toBeVisible();
  1014 |     await expect(page.getByTestId("case-message-list")).toBeVisible();
  1015 |     await expect(
  1016 |       page.getByTestId("case-message-row-ccm_case_new_open_13"),
  1017 |     ).toBeVisible();
  1018 |     await expect(
  1019 |       page.getByTestId("case-conversation-context-banner"),
  1020 |     ).toHaveAttribute("data-collapsed", "false");
  1021 |     await expect(
  1022 |       page.getByRole("heading", { name: "Conversation" }),
  1023 |     ).toHaveCount(0);
  1024 |     await expect(
  1025 |       page.getByTestId("case-conversation-primary-label"),
  1026 |     ).toHaveText("ART-DETAIL-001");
  1027 |     await expect(page.getByTestId("case-conversation-subtitle")).toHaveText(
  1028 |       "Return • After purchase",
  1029 |     );
  1030 |     await expect(
  1031 |       page.getByTestId("case-conversation-info-button"),
  1032 |     ).toBeEnabled();
  1033 |     await expect(page.getByTestId("case-conversation-state-button")).toHaveText(
  1034 |       "Process",
  1035 |     );
  1036 |   });
  1037 | 
  1038 |   test("refreshing a case conversation keeps the same case route and reloads the thread", async ({
  1039 |     page,
  1040 |   }) => {
  1041 |     await installCasesMocks(page);
  1042 | 
  1043 |     await page.goto("/cases");
  1044 |     await openCase(page, "case_new_open");
  1045 |     await expect(page).toHaveURL(/\/cases\/case_new_open$/);
  1046 |     await expect(
  1047 |       page.getByTestId("case-message-row-ccm_case_new_open_13"),
  1048 |     ).toBeVisible();
  1049 | 
  1050 |     await page.reload();
  1051 | 
  1052 |     await expect(page).toHaveURL(/\/cases\/case_new_open$/);
  1053 |     await expect(page.getByTestId("case-conversation-slide")).toBeVisible();
  1054 |     await expect(page.getByTestId("case-message-list")).toBeVisible();
  1055 |     await expect(
```