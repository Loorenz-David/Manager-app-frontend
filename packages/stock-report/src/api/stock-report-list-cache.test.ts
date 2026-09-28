import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { wirePrioritisedStockReportItem, wireStockReportSnapshotVersion } from "../fixtures/stock-report-wire-fixtures";
import { stockReportKeys } from "./stock-report-keys";
import { cachedStockReportDraftScopes, dropStockReportVersionQueries } from "./stock-report-list-cache";

const ALL = { majorCategory: null, missingOnly: false, versionId: null };
const DRAFT = { majorCategory: null, missingOnly: false, versionId: "srv-draft" };

function observe(queryClient: QueryClient, queryKey: readonly unknown[]) {
  const observer = new QueryObserver(queryClient, { queryKey, queryFn: () => new Promise(() => {}), enabled: false });
  return observer.subscribe(() => {});
}

/**
 * Projection R11: after a version was activated or deleted, its lists are
 * removed where nobody observes them; a mounted draft page keeps its entry
 * (it closes itself) and is not refetched; the mounted active board is reset
 * so it fetches the new version instead of painting the old rows first.
 */
describe("dropStockReportVersionQueries", () => {
  it("removes a draft's unobserved lists and read, keeps an observed list without refetching, and leaves the board alone", async () => {
    const queryClient = new QueryClient();
    const observedKey = stockReportKeys.list("high", DRAFT);
    const unobservedKey = stockReportKeys.list("low", DRAFT);
    const boardKey = stockReportKeys.list("high", ALL);
    queryClient.setQueryData(observedKey, [wirePrioritisedStockReportItem("sri-1", "high")]);
    queryClient.setQueryData(unobservedKey, []);
    queryClient.setQueryData(boardKey, [wirePrioritisedStockReportItem("sri-2", "high")]);
    queryClient.setQueryData(stockReportKeys.version("srv-draft", "all"), wireStockReportSnapshotVersion({ client_id: "srv-draft", state: "draft" }));
    const unsubscribe = observe(queryClient, observedKey);

    dropStockReportVersionQueries(queryClient, "srv-draft");

    expect(queryClient.getQueryData(unobservedKey)).toBeUndefined();
    expect(queryClient.getQueryData(stockReportKeys.version("srv-draft", "all"))).toBeUndefined();
    expect(queryClient.getQueryData(observedKey)).toBeDefined();
    expect(queryClient.getQueryState(observedKey)?.fetchStatus).toBe("idle");
    expect(queryClient.getQueryData(boardKey)).toBeDefined();
    unsubscribe();
  });

  it("removes the board's unobserved lists and resets an observed one", () => {
    const queryClient = new QueryClient();
    const observedKey = stockReportKeys.list("high", ALL);
    const unobservedKey = stockReportKeys.list("low", ALL);
    queryClient.setQueryData(observedKey, [wirePrioritisedStockReportItem("sri-1", "high")]);
    queryClient.setQueryData(unobservedKey, []);
    const unsubscribe = observe(queryClient, observedKey);

    dropStockReportVersionQueries(queryClient, "active");

    expect(queryClient.getQueryData(unobservedKey)).toBeUndefined();
    // Reset: the entry survives for its observer, empty, so the board shows a
    // fresh fetch rather than the closed version's rows.
    expect(queryClient.getQueryData(observedKey)).toBeUndefined();
    expect(queryClient.getQueryState(observedKey)).toBeDefined();
    unsubscribe();
  });

  it("lists the draft scopes someone opened, never the board", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), []);
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), []);
    queryClient.setQueryData(stockReportKeys.list("low", DRAFT), []);
    queryClient.setQueryData(stockReportKeys.list("high", { ...DRAFT, versionId: "srv-other" }), []);

    expect(cachedStockReportDraftScopes(queryClient).toSorted()).toEqual(["srv-draft", "srv-other"]);
  });
});
