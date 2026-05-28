# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: features/cases/cases-page.spec.ts >> cases page >> context banner collapses after the list scrolls and restores at the top
- Location: tests/playwright/features/cases/cases-page.spec.ts:1410:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('case-conversation-context-banner')
Expected: "false"
Received: "true"
Timeout:  1000ms

Call log:
  - Expect "toHaveAttribute" with timeout 1000ms
  - waiting for getByTestId('case-conversation-context-banner')
    11 × locator resolved to <div data-collapsed="true" data-testid="case-conversation-context-banner" class="absolute inset-x-0 top-0 z-20 h-16 overflow-hidden border-b border-muted bg-primary text-card shadow-sm will-change-transform transition-transform duration-220 ease-[cubic-bezier(0.32,0.72,0,1)] -translate-y-16">…</div>
       - unexpected value "true"

```

```yaml
- paragraph: Damage
- paragraph: May 26, 2026 at 09:00 AM
```

# Test source

```ts
  1371 |       const steps = samples
  1372 |         .slice(1)
  1373 |         .map((value, index) => value - samples[index]);
  1374 |       const jumpStepsOver8px = steps.filter((step) => Math.abs(step) >= 8);
  1375 |       const signChanges = steps.slice(1).filter((step, index) => {
  1376 |         const previous = steps[index];
  1377 |         return (
  1378 |           Math.sign(step) !== 0 &&
  1379 |           Math.sign(previous) !== 0 &&
  1380 |           Math.sign(step) !== Math.sign(previous)
  1381 |         );
  1382 |       }).length;
  1383 | 
  1384 |       return {
  1385 |         startTop,
  1386 |         endTop: element.scrollTop,
  1387 |         jumpStepsOver8px: jumpStepsOver8px.length,
  1388 |         signChanges,
  1389 |       };
  1390 |     });
  1391 | 
  1392 |     await expect(
  1393 |       page.getByTestId("case-message-row-ccm_case_new_open_2"),
  1394 |     ).toBeVisible({
  1395 |       timeout: 1500,
  1396 |     });
  1397 | 
  1398 |     const metrics = await metricsPromise;
  1399 | 
  1400 |     expect(
  1401 |       detailRequests.some(
  1402 |         (request) =>
  1403 |           request.caseId === "case_new_open" && request.beforeMessageSeq === 6,
  1404 |       ),
  1405 |     ).toBe(true);
  1406 |     expect(metrics.jumpStepsOver8px).toBeLessThanOrEqual(1);
  1407 |     expect(metrics.signChanges).toBe(0);
  1408 |   });
  1409 | 
  1410 |   test("context banner collapses after the list scrolls and restores at the top", async ({
  1411 |     page,
  1412 |   }) => {
  1413 |     await installMockAuth(page);
  1414 |     await installCasesMocks(page);
  1415 | 
  1416 |     await page.goto("/cases");
  1417 |     await openCase(page, "case_new_open");
  1418 | 
  1419 |     const header = page.getByTestId("case-conversation-header");
  1420 |     const banner = page.getByTestId("case-conversation-context-banner");
  1421 |     const scrollContainer = page.getByTestId(
  1422 |       "case-conversation-scroll-container",
  1423 |     );
  1424 |     // Inverted chat lists are considered "at start" when the scroller is at the
  1425 |     // DOM bottom. Normalize there first so initial banner assertions are stable.
  1426 |     await scrollContainer.evaluate((element) => {
  1427 |       element.scrollTop = element.scrollHeight - element.clientHeight;
  1428 |     });
  1429 |     await page.waitForTimeout(80);
  1430 |     await expect(banner).toHaveAttribute("data-collapsed", "false");
  1431 |     await page.waitForTimeout(150);
  1432 |     const initialScrollTop = await scrollContainer.evaluate(
  1433 |       (element) => element.scrollTop,
  1434 |     );
  1435 | 
  1436 |     await scrollContainer.evaluate((element) => {
  1437 |       element.scrollTop = 10;
  1438 |     });
  1439 | 
  1440 |     await expect(banner).toHaveAttribute("data-collapsed", "true", {
  1441 |       timeout: 1000,
  1442 |     });
  1443 |     await expect(header).toBeVisible();
  1444 | 
  1445 |     const collapsedSamples: string[] = [];
  1446 |     for (let index = 0; index < 8; index += 1) {
  1447 |       if (index > 0) {
  1448 |         await page.waitForTimeout(60);
  1449 |       }
  1450 | 
  1451 |       collapsedSamples.push(
  1452 |         (await banner.getAttribute("data-collapsed")) ?? "",
  1453 |       );
  1454 |     }
  1455 | 
  1456 |     expect(collapsedSamples).toEqual([
  1457 |       "true",
  1458 |       "true",
  1459 |       "true",
  1460 |       "true",
  1461 |       "true",
  1462 |       "true",
  1463 |       "true",
  1464 |       "true",
  1465 |     ]);
  1466 | 
  1467 |     await scrollContainer.evaluate((element, scrollTop) => {
  1468 |       element.scrollTop = scrollTop;
  1469 |     }, initialScrollTop);
  1470 | 
> 1471 |     await expect(banner).toHaveAttribute("data-collapsed", "false", {
       |                          ^ Error: expect(locator).toHaveAttribute(expected) failed
  1472 |       timeout: 1000,
  1473 |     });
  1474 |     await expect(header).toBeVisible();
  1475 |   });
  1476 | 
  1477 |   test("back button closes the conversation slide", async ({ page }) => {
  1478 |     await installMockAuth(page);
  1479 |     await installCasesMocks(page);
  1480 | 
  1481 |     await page.goto("/cases");
  1482 |     await openCase(page, "case_new_open");
  1483 | 
  1484 |     await page.getByTestId("case-conversation-back-button").click();
  1485 |     await expect(page.getByTestId("case-conversation-slide")).not.toBeVisible();
  1486 |   });
  1487 | 
  1488 |   test("closing the conversation does not replay the cases tab animation", async ({
  1489 |     page,
  1490 |   }) => {
  1491 |     await installMockAuth(page);
  1492 |     await installCasesMocks(page);
  1493 | 
  1494 |     await page.goto("/cases");
  1495 |     await openCase(page, "case_new_open");
  1496 | 
  1497 |     const tabOutlet = page.locator("#main-content > div");
  1498 | 
  1499 |     await page.getByTestId("case-conversation-back-button").click();
  1500 |     await expect(page).toHaveURL("/cases");
  1501 |     await expect(page.getByTestId("case-conversation-slide")).not.toBeVisible();
  1502 |     await expect(page.getByTestId("cases-page")).toBeVisible();
  1503 | 
  1504 |     const transforms: string[] = [];
  1505 |     for (let index = 0; index < 5; index += 1) {
  1506 |       if (index > 0) {
  1507 |         await page.waitForTimeout(50);
  1508 |       }
  1509 | 
  1510 |       transforms.push(
  1511 |         await tabOutlet.evaluate(
  1512 |           (element) => getComputedStyle(element).transform,
  1513 |         ),
  1514 |       );
  1515 |     }
  1516 | 
  1517 |     expect(transforms).toEqual(["none", "none", "none", "none", "none"]);
  1518 |   });
  1519 | 
  1520 |   test("opening a conversation marks the latest visible message as read and clears the cases unread badge without duplicate calls", async ({
  1521 |     page,
  1522 |   }) => {
  1523 |     const markReadRequests: Array<{
  1524 |       case_participant_client_id: string;
  1525 |       up_to_message_seq: number;
  1526 |     }> = [];
  1527 | 
  1528 |     await installMockAuth(page);
  1529 |     await installCasesMocks(page, {
  1530 |       onMarkReadRequest: ({ body }) => {
  1531 |         markReadRequests.push(body);
  1532 |       },
  1533 |     });
  1534 | 
  1535 |     await page.goto("/cases");
  1536 |     await expect(page.getByTestId("case-card-unread-case_new_open")).toHaveText(
  1537 |       "3",
  1538 |     );
  1539 | 
  1540 |     await openCase(page, "case_new_open");
  1541 | 
  1542 |     await expect
  1543 |       .poll(() => markReadRequests)
  1544 |       .toEqual([
  1545 |         {
  1546 |           case_participant_client_id: "cpt_case_new_open_manager",
  1547 |           up_to_message_seq: 15,
  1548 |         },
  1549 |       ]);
  1550 | 
  1551 |     const scrollContainer = page.getByTestId(
  1552 |       "case-conversation-scroll-container",
  1553 |     );
  1554 | 
  1555 |     await scrollContainer.evaluate((element) => {
  1556 |       element.scrollTop = 0;
  1557 |     });
  1558 |     await expect(
  1559 |       page.getByTestId("case-message-row-ccm_case_new_open_6"),
  1560 |     ).toBeVisible();
  1561 | 
  1562 |     await scrollContainer.evaluate((element) => {
  1563 |       element.scrollTop = element.scrollHeight;
  1564 |     });
  1565 | 
  1566 |     await page.waitForTimeout(250);
  1567 |     await expect(markReadRequests).toHaveLength(1);
  1568 | 
  1569 |     await page.getByTestId("case-conversation-back-button").click();
  1570 |     await expect(page.getByTestId("case-conversation-slide")).not.toBeVisible();
  1571 |     await expect(
```