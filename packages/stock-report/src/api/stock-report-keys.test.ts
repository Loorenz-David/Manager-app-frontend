import { describe, expect, it } from "vitest";

import { stockReportKeys } from "./stock-report-keys";

const BOARD = { majorCategory: null, missingOnly: false, versionId: null };

describe("stockReportKeys", () => {
  it("puts the version scope right after the lists prefix, so one version's lists are a prefix (plan §3.1)", () => {
    const board = stockReportKeys.list("high", BOARD);
    const draft = stockReportKeys.list("high", { ...BOARD, versionId: "srv-draft" });

    expect(board).toEqual([...stockReportKeys.lists(), "active", "high", "all", "board"]);
    expect(draft).toEqual([...stockReportKeys.lists(), "srv-draft", "high", "all", "board"]);
    expect(board.slice(0, stockReportKeys.versionLists("active").length)).toEqual([...stockReportKeys.versionLists("active")]);
    expect(draft.slice(0, stockReportKeys.bucketLists("srv-draft", "high").length)).toEqual([...stockReportKeys.bucketLists("srv-draft", "high")]);
  });

  it("reads every segment by position from the front, never from the end", () => {
    const key = stockReportKeys.list("medium", { majorCategory: "wood", missingOnly: true, versionId: "srv-draft" });

    expect(stockReportKeys.versionScopeOfListKey(key)).toBe("srv-draft");
    expect(stockReportKeys.bucketOfListKey(key)).toBe("medium");
    expect(stockReportKeys.filterOfListKey(key)).toBe("wood");
    expect(stockReportKeys.isMissingListKey(key)).toBe(true);
    expect(stockReportKeys.isMissingListKey(stockReportKeys.list("medium", BOARD))).toBe(false);
  });

  it("keys a row's detail entry with the scope last, so every scope's entry shares one prefix (projection R5)", () => {
    expect(stockReportKeys.item("sri-1", "active")).toEqual([...stockReportKeys.itemAll("sri-1"), "active"]);
    expect(stockReportKeys.item("sri-1", "srv-draft")).toEqual([...stockReportKeys.itemAll("sri-1"), "srv-draft"]);
    expect(stockReportKeys.item("sri-1", "srv-draft").slice(0, -1)).toEqual([...stockReportKeys.itemAll("sri-1")]);
  });

  it("keys the versions list by its state filter and progress filter under one prefix", () => {
    const history = stockReportKeys.versionList({ states: ["active", "closed"], progressPriority: "high,medium,low" });
    const drafts = stockReportKeys.versionList({ states: ["draft"], progressPriority: "high,medium,low" });
    const every = stockReportKeys.versionList({ states: [], progressPriority: "all" });

    expect(history).toEqual([...stockReportKeys.versionList(), "active,closed", "high,medium,low"]);
    expect(drafts).toEqual([...stockReportKeys.versionList(), "draft", "high,medium,low"]);
    expect(every).toEqual([...stockReportKeys.versionList(), "any", "all"]);
    expect(stockReportKeys.version("srv-1", "all")).toEqual([...stockReportKeys.versions(), "one", "srv-1", "all"]);
    expect(stockReportKeys.draftCount()).toEqual([...stockReportKeys.versions(), "draft-count"]);
    // The active read, the single read, the list and the count all sit under `versions()`.
    for (const key of [history, stockReportKeys.activeVersion(), stockReportKeys.version("srv-1"), stockReportKeys.draftCount()]) {
      expect(key.slice(0, stockReportKeys.versions().length)).toEqual([...stockReportKeys.versions()]);
    }
  });
});
