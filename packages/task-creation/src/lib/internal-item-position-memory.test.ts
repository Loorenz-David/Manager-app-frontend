import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearRememberedInternalItemPosition,
  INTERNAL_ITEM_POSITION_MEMORY_STORAGE_KEY,
  INTERNAL_ITEM_POSITION_MEMORY_TTL_MS,
  readRememberedInternalItemPosition,
  writeRememberedInternalItemPosition,
} from "./internal-item-position-memory";

const NOW = 2_000_000_000_000;

describe("internal item-position memory", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("stores a trimmed position for the current user", () => {
    writeRememberedInternalItemPosition("user-1", "  42 A  ", NOW);

    expect(readRememberedInternalItemPosition("user-1", NOW)).toBe("42 A");
  });

  it("isolates remembered positions by user", () => {
    writeRememberedInternalItemPosition("user-1", "12", NOW);
    writeRememberedInternalItemPosition("user-2", "27", NOW);

    expect(readRememberedInternalItemPosition("user-1", NOW)).toBe("12");
    expect(readRememberedInternalItemPosition("user-2", NOW)).toBe("27");
    expect(readRememberedInternalItemPosition("user-3", NOW)).toBeNull();
  });

  it("expires and removes a position at the five-minute boundary", () => {
    writeRememberedInternalItemPosition("user-1", "12", NOW);

    expect(
      readRememberedInternalItemPosition(
        "user-1",
        NOW + INTERNAL_ITEM_POSITION_MEMORY_TTL_MS - 1,
      ),
    ).toBe("12");
    expect(
      readRememberedInternalItemPosition(
        "user-1",
        NOW + INTERNAL_ITEM_POSITION_MEMORY_TTL_MS,
      ),
    ).toBeNull();
    expect(
      window.localStorage.getItem(INTERNAL_ITEM_POSITION_MEMORY_STORAGE_KEY),
    ).toBeNull();
  });

  it("refreshes the lifetime when a successful creation stores it again", () => {
    writeRememberedInternalItemPosition("user-1", "12", NOW);
    writeRememberedInternalItemPosition(
      "user-1",
      "12",
      NOW + INTERNAL_ITEM_POSITION_MEMORY_TTL_MS - 1,
    );

    expect(
      readRememberedInternalItemPosition(
        "user-1",
        NOW + INTERNAL_ITEM_POSITION_MEMORY_TTL_MS,
      ),
    ).toBe("12");
  });

  it("clears the user's memory when the submitted position is empty", () => {
    writeRememberedInternalItemPosition("user-1", "12", NOW);
    writeRememberedInternalItemPosition("user-2", "27", NOW);

    writeRememberedInternalItemPosition("user-1", "   ", NOW + 1);

    expect(readRememberedInternalItemPosition("user-1", NOW + 1)).toBeNull();
    expect(readRememberedInternalItemPosition("user-2", NOW + 1)).toBe("27");
  });

  it("supports explicitly clearing one user's memory", () => {
    writeRememberedInternalItemPosition("user-1", "12", NOW);
    writeRememberedInternalItemPosition("user-2", "27", NOW);

    clearRememberedInternalItemPosition("user-1");

    expect(readRememberedInternalItemPosition("user-1", NOW)).toBeNull();
    expect(readRememberedInternalItemPosition("user-2", NOW)).toBe("27");
  });

  it("ignores and removes malformed stored data", () => {
    window.localStorage.setItem(
      INTERNAL_ITEM_POSITION_MEMORY_STORAGE_KEY,
      JSON.stringify({
        "user-1": { position: 12, rememberedAt: "not-a-number" },
      }),
    );

    expect(readRememberedInternalItemPosition("user-1", NOW)).toBeNull();
    expect(
      window.localStorage.getItem(INTERNAL_ITEM_POSITION_MEMORY_STORAGE_KEY),
    ).toBeNull();
  });

  it("does not throw when local storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    expect(() =>
      writeRememberedInternalItemPosition("user-1", "12", NOW),
    ).not.toThrow();
    expect(readRememberedInternalItemPosition("user-1", NOW)).toBeNull();
    expect(() =>
      clearRememberedInternalItemPosition("user-1"),
    ).not.toThrow();
  });
});
