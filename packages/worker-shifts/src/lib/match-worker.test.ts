import { describe, expect, it } from "vitest";
import type { FloorRosterUser } from "../types";
import { matchWorker } from "./match-worker";

const roster: FloorRosterUser[] = [
  {
    client_id: "usr_1",
    username: "Mykola",
    profile_picture: "https://example.com/1.jpg",
    role: { name: "Worker" },
    clock_in_code: "4821",
    email: "mykola@shop.com",
  },
  {
    client_id: "usr_2",
    username: "Sara",
    profile_picture: "https://example.com/2.jpg",
    role: { name: "Worker" },
    clock_in_code: null,
    email: "shared@shop.com",
  },
  {
    client_id: "usr_3",
    username: "Noah",
    profile_picture: "https://example.com/3.jpg",
    role: { name: "Worker" },
    clock_in_code: "7314",
    email: "SHARED@SHOP.COM",
  },
];

describe("matchWorker", () => {
  it("trims input and matches a clock-in code exactly", () => {
    expect(matchWorker(roster, "  4821  ")?.client_id).toBe("usr_1");
    expect(matchWorker(roster, "04821")).toBeNull();
  });

  it("matches email case-insensitively", () => {
    expect(matchWorker(roster, "  MYKOLA@SHOP.COM ")?.client_id).toBe("usr_1");
  });

  it("does not treat a null code as a match", () => {
    expect(matchWorker(roster, "")).toBeNull();
    expect(matchWorker(roster, "null")).toBeNull();
  });

  it("returns the first match when dirty data contains duplicate emails", () => {
    expect(matchWorker(roster, "shared@shop.com")?.client_id).toBe("usr_2");
  });

  it("never throws for malformed runtime input", () => {
    const malformedRoster = [null] as unknown as FloorRosterUser[];
    expect(() => matchWorker(malformedRoster, "4821")).not.toThrow();
    expect(matchWorker(malformedRoster, "4821")).toBeNull();
  });
});
