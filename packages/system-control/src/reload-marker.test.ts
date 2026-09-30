import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTOMATIC_RELOAD_STORAGE_KEY,
  consumeAutomaticReloadMarker,
  markAutomaticReload,
  reloadAutomatically,
  resetAutomaticReloadMarkerForTests,
} from "./reload-marker";

beforeEach(() => {
  resetAutomaticReloadMarkerForTests();
  sessionStorage.clear();
});

describe("automatic reload marker", () => {
  it("is consumed once per page load and remembered", () => {
    markAutomaticReload(1_000_000);
    expect(sessionStorage.getItem(AUTOMATIC_RELOAD_STORAGE_KEY)).toBe("1000000");

    expect(consumeAutomaticReloadMarker(1_030_000)).toBe(true);
    expect(sessionStorage.getItem(AUTOMATIC_RELOAD_STORAGE_KEY)).toBeNull();
    // A second mount of the same page load gets the same answer.
    expect(consumeAutomaticReloadMarker(1_030_000)).toBe(true);
  });

  it.each([
    ["absent", null, 0],
    ["older than 60 s", "1000000", 1_060_001],
    ["from the future", "2000000", 1_000_000],
    ["garbage", "soon", 1_000_000],
  ])("is not an automatic reload when %s", (_label, stored, now) => {
    if (stored !== null) sessionStorage.setItem(AUTOMATIC_RELOAD_STORAGE_KEY, stored);
    expect(consumeAutomaticReloadMarker(now)).toBe(false);
  });

  it("reloadAutomatically marks before it reloads", () => {
    const reload = vi.fn(() => {
      expect(sessionStorage.getItem(AUTOMATIC_RELOAD_STORAGE_KEY)).not.toBeNull();
    });
    reloadAutomatically(reload);

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
