import { describe, expect, it } from "vitest";

import { secondsToHM } from "./format-duration";

describe("secondsToHM", () => {
  it("always returns hours and minutes", () => {
    expect(secondsToHM(0)).toBe("0h 0m");
    expect(secondsToHM(59)).toBe("0h 0m");
    expect(secondsToHM(3_599)).toBe("0h 59m");
    expect(secondsToHM(3_600)).toBe("1h 0m");
    expect(secondsToHM(26_040)).toBe("7h 14m");
  });
});
