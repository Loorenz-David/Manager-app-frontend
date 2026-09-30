import { describe, expect, it, vi } from "vitest";

import { fetchSystemStatus, requestSystemWake } from "./client";
import { parseSystemStatusBody } from "./contract";

function respond(body: string, init: ResponseInit = {}): typeof fetch {
  return vi.fn(async () => new Response(body, init)) as unknown as typeof fetch;
}

const JSON_TYPE = { "Content-Type": "application/json; charset=utf-8" };

describe("parseSystemStatusBody", () => {
  it("reads a full version-1 body", () => {
    expect(
      parseSystemStatusBody({
        version: 1,
        state: "STARTING",
        phase: "SERVER",
        retry_after_seconds: 2,
        estimated_remaining_seconds: 40,
        message_code: "starting",
        extra: "ignored",
      }),
    ).toEqual({
      state: "STARTING",
      phase: "SERVER",
      retryAfterSeconds: 2,
      estimatedRemainingSeconds: 40,
      messageCode: "starting",
    });
  });

  it.each([
    ["null", null],
    ["an array", [{ version: 1, state: "READY" }]],
    ["version 2", { version: 2, state: "READY" }],
    ["version '1'", { version: "1", state: "READY" }],
    ["no version", { state: "READY" }],
    ["an unknown state", { version: 1, state: "RUNNING" }],
    ["a lowercase state", { version: 1, state: "ready" }],
    ["a negative retry", { version: 1, state: "READY", retry_after_seconds: -1 }],
    ["a numeric phase", { version: 1, state: "STARTING", phase: 3 }],
  ])("rejects %s", (_label, body) => {
    expect(parseSystemStatusBody(body)).toBeNull();
  });

  it("maps an unknown or null phase to null", () => {
    expect(parseSystemStatusBody({ version: 1, state: "STARTING", phase: "NEW" })?.phase).toBeNull();
    expect(parseSystemStatusBody({ version: 1, state: "STARTING", phase: null })?.phase).toBeNull();
  });
});

describe("fetchSystemStatus / requestSystemWake", () => {
  it("GET needs 200; the wake accepts 202", async () => {
    const body = '{"version":1,"state":"READY"}';
    await expect(
      fetchSystemStatus({ fetch: respond(body, { status: 202, headers: JSON_TYPE }) }),
    ).resolves.toEqual({ ok: false, failure: "http", httpStatus: 202 });
    await expect(
      requestSystemWake({ fetch: respond(body, { status: 202, headers: JSON_TYPE }) }),
    ).resolves.toMatchObject({ ok: true, status: { state: "READY" } });
  });

  it("uses the page origin, GET/POST without a body, no cookies, no cache", async () => {
    const fetchSpy = respond('{"version":1,"state":"READY"}', { status: 200, headers: JSON_TYPE });
    await fetchSystemStatus({ fetch: fetchSpy });
    const wakeSpy = respond('{"version":1,"state":"READY"}', { status: 202, headers: JSON_TYPE });
    await requestSystemWake({ fetch: wakeSpy });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${window.location.origin}/system/status`,
      expect.objectContaining({ method: "GET", credentials: "omit", cache: "no-store" }),
    );
    expect(wakeSpy).toHaveBeenCalledWith(
      `${window.location.origin}/system/wake`,
      expect.objectContaining({ method: "POST", credentials: "omit", cache: "no-store" }),
    );
    const wakeInit = (wakeSpy as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(wakeInit.body).toBeUndefined();
  });

  it("classifies failures", async () => {
    await expect(
      fetchSystemStatus({
        fetch: vi.fn(async () => {
          throw new TypeError("Failed to fetch");
        }) as unknown as typeof fetch,
      }),
    ).resolves.toEqual({ ok: false, failure: "network", httpStatus: null });
    await expect(
      fetchSystemStatus({ fetch: respond("<!doctype html>", { status: 200, headers: { "Content-Type": "text/html" } }) }),
    ).resolves.toEqual({ ok: false, failure: "invalid_response", httpStatus: 200 });
    await expect(
      fetchSystemStatus({ fetch: respond("not json", { status: 200, headers: JSON_TYPE }) }),
    ).resolves.toEqual({ ok: false, failure: "invalid_response", httpStatus: 200 });
    await expect(
      fetchSystemStatus({ fetch: respond("{}", { status: 503, headers: JSON_TYPE }) }),
    ).resolves.toEqual({ ok: false, failure: "http", httpStatus: 503 });
  });

  it("rejects on the caller's own abort instead of reporting a failure", async () => {
    const controller = new AbortController();
    const hanging = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;

    const pending = fetchSystemStatus({ fetch: hanging, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
