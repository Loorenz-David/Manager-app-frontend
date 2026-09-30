import { describe, expect, it } from "vitest";

import { createQueryClient } from "./query-client";

describe("createQueryClient", () => {
  it("sends mutations even while react-query is offline; queries keep pausing", () => {
    const defaults = createQueryClient().getDefaultOptions();

    expect(defaults.mutations?.networkMode).toBe("always");
    expect(defaults.mutations?.retry).toBe(0);
    // Unset means react-query's "online": queries pause while the system
    // gate holds react-query offline and resume when it is READY.
    expect(defaults.queries?.networkMode).toBeUndefined();
  });
});
