import {
  SYSTEM_STATUS_PATH,
  SYSTEM_WAKE_PATH,
  parseSystemStatusBody,
  type SystemStatus,
} from "./contract";

/** How long a status or wake request may take before it counts as failed. */
export const SYSTEM_REQUEST_TIMEOUT_MS = 8_000;

export type SystemRequestFailure =
  /** No response: offline, DNS, connection refused, CORS. */
  | "network"
  /** No response within the timeout. */
  | "timeout"
  /** A response with an unexpected HTTP status (404, 5xx, ...). */
  | "http"
  /**
   * A response that is not a version-1 JSON body: wrong content type (e.g. the
   * SPA's index.html), invalid JSON, unknown state, other version.
   */
  | "invalid_response";

export type SystemRequestOutcome =
  | { ok: true; status: SystemStatus }
  | { ok: false; failure: SystemRequestFailure; httpStatus: number | null };

export type SystemClientOptions = {
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /**
   * Defaults to `window.location.origin`. Never the API origin
   * (`VITE_API_URL`): the control plane lives on the application origin.
   */
  origin?: string;
  timeoutMs?: number;
  /** Aborting it cancels the request; the promise then rejects (AbortError). */
  signal?: AbortSignal;
};

function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  const mime = value.split(";")[0]?.trim().toLowerCase();
  return mime === "application/json";
}

async function requestSystem(
  method: "GET" | "POST",
  path: string,
  expectedStatus: ReadonlySet<number>,
  options: SystemClientOptions,
): Promise<SystemRequestOutcome> {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const origin = options.origin ?? window.location.origin;
  const url = new URL(path, origin).toString();

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? SYSTEM_REQUEST_TIMEOUT_MS);
  const onOuterAbort = (): void => controller.abort();
  options.signal?.addEventListener("abort", onOuterAbort, { once: true });

  try {
    let response: Response;
    try {
      response = await doFetch(url, {
        method,
        // The control plane must never receive the application's cookies, and
        // no cache (browser, service worker, proxy) may answer for it.
        credentials: "omit",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      return {
        ok: false,
        failure: timedOut ? "timeout" : "network",
        httpStatus: null,
      };
    }

    if (!expectedStatus.has(response.status)) {
      return { ok: false, failure: "http", httpStatus: response.status };
    }
    if (!isJsonContentType(response.headers.get("Content-Type"))) {
      return {
        ok: false,
        failure: "invalid_response",
        httpStatus: response.status,
      };
    }

    let body: unknown;
    try {
      body = JSON.parse(await response.text());
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (timedOut) {
        return { ok: false, failure: "timeout", httpStatus: response.status };
      }
      return {
        ok: false,
        failure: "invalid_response",
        httpStatus: response.status,
      };
    }

    const status = parseSystemStatusBody(body);
    if (!status) {
      return {
        ok: false,
        failure: "invalid_response",
        httpStatus: response.status,
      };
    }
    return { ok: true, status };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onOuterAbort);
  }
}

const STATUS_OK: ReadonlySet<number> = new Set([200]);
// The contract answers a wake with 202; a 200 carrying the same body is read
// the same way.
const WAKE_OK: ReadonlySet<number> = new Set([200, 202]);

/** GET /system/status. Never throws except on the caller's own abort. */
export function fetchSystemStatus(
  options: SystemClientOptions = {},
): Promise<SystemRequestOutcome> {
  return requestSystem("GET", SYSTEM_STATUS_PATH, STATUS_OK, options);
}

/** POST /system/wake (no body). Never throws except on the caller's abort. */
export function requestSystemWake(
  options: SystemClientOptions = {},
): Promise<SystemRequestOutcome> {
  return requestSystem("POST", SYSTEM_WAKE_PATH, WAKE_OK, options);
}
