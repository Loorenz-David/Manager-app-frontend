import { describe, expect, it } from "vitest";

import {
  getRequiredConsensusHits,
  registerDecodeHit,
} from "./camera-session.manager";

describe("getRequiredConsensusHits", () => {
  it("accepts QR on the first hit", () => {
    expect(getRequiredConsensusHits("qr")).toBe(1);
  });

  it("requires repeated hits for 1D barcodes", () => {
    expect(getRequiredConsensusHits("barcode")).toBeGreaterThan(1);
    expect(getRequiredConsensusHits("any")).toBeGreaterThan(1);
  });
});

describe("registerDecodeHit", () => {
  it("accepts immediately when only one hit is required", () => {
    const out = registerDecodeHit(null, "123", 0, 1);
    expect(out.accepted).toBe("123");
    expect(out.state).toBeNull();
  });

  it("accepts a value only after it repeats the required number of times", () => {
    let state = null as ReturnType<typeof registerDecodeHit>["state"];
    let out = registerDecodeHit(state, "4006381333931", 0, 3, 900);
    expect(out.accepted).toBeNull();
    state = out.state;
    out = registerDecodeHit(state, "4006381333931", 100, 3, 900);
    expect(out.accepted).toBeNull();
    state = out.state;
    out = registerDecodeHit(state, "4006381333931", 200, 3, 900);
    expect(out.accepted).toBe("4006381333931");
    expect(out.state).toBeNull();
  });

  it("resets the tally when a different value is read", () => {
    let out = registerDecodeHit(null, "4006381333931", 0, 3, 900);
    out = registerDecodeHit(out.state, "4006381333931", 100, 3, 900);
    out = registerDecodeHit(out.state, "A4006381", 200, 3, 900); // phantom
    expect(out.accepted).toBeNull();
    expect(out.state?.hits).toBe(1);
    out = registerDecodeHit(out.state, "4006381333931", 300, 3, 900);
    expect(out.accepted).toBeNull();
    expect(out.state?.hits).toBe(1);
  });

  it("restarts the tally when hits fall outside the window", () => {
    let out = registerDecodeHit(null, "123", 0, 3, 900);
    out = registerDecodeHit(out.state, "123", 500, 3, 900);
    out = registerDecodeHit(out.state, "123", 1000, 3, 900);
    expect(out.accepted).toBeNull();
    expect(out.state?.hits).toBe(1);
    expect(out.state?.firstSeenAt).toBe(1000);
  });
});
