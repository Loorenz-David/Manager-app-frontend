import { z } from "zod";
import { env } from './env';
import {
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from './auth-token';
import { ApiErrorSchema } from '@beyo/lib';
import {
  ACTIVITY_HEADER,
  resolveRequestActivity,
  type RequestActivity,
} from './activity';

/** Some backend failures deliberately do not use the project error envelope. */
const DetailErrorSchema = z.object({ detail: z.unknown() });

/**
 * `ApiRequestError.code` when the backend could not be reached or could not
 * answer: a network failure (status 0), or a 502, 503 or 504 response — which
 * includes the backend's 503 `auth_unavailable` (it cannot validate a session
 * right now; `serverCode` then carries `auth_unavailable`). Never a verdict on
 * the credentials: callers must not sign the user out on it.
 */
export const UNAVAILABLE_ERROR_CODE = "unavailable";

/**
 * `ApiRequestError.code` (status 0) when a response arrived but its body is
 * not what the caller's schema expects (or is not JSON). Distinct from
 * "unavailable": retrying will not help.
 */
export const INVALID_RESPONSE_ERROR_CODE = "invalid_response";

/** Window event dispatched for every "unavailable" request failure. */
export const SYSTEM_UNAVAILABLE_EVENT = "system:unavailable";

export type SystemUnavailableDetail = {
  /** HTTP status (502, 503, 504), or 0 when no usable response arrived. */
  status: number;
  /** The request path as passed to the client, without query parameters. */
  path: string;
  /**
   * Whether the failed request was classified `background` (the value its
   * `X-Beyo-Activity` header carried).
   */
  background: boolean;
};

export type { RequestActivity };

/** Per-call options of the public `apiClient` helpers. */
export type ApiCallOptions = {
  /**
   * Classifies the request for the backend's human-activity tracking
   * (`X-Beyo-Activity`). Unset: `user` iff a trusted input happened in the
   * last 10 s, else `background`. Pass `"background"` from automatic paths
   * (effects, timers, polls) whatever the method.
   */
  activity?: RequestActivity;
};

/**
 * Window event dispatched once on the first successful (2xx) response after
 * one or more "unavailable" failures: the backend answers again. No detail.
 * The system gate (`@beyo/system-control`) clears its "reconnecting" state on
 * it.
 */
export const SYSTEM_AVAILABLE_EVENT = "system:available";

/** Whether an "unavailable" failure is still unanswered by a success. */
let outageReported = false;

function dispatchSystemAvailableIfRecovering(): void {
  if (!outageReported) return;
  outageReported = false;
  window.dispatchEvent(new CustomEvent(SYSTEM_AVAILABLE_EVENT));
}

function dispatchSystemUnavailable(detail: SystemUnavailableDetail): void {
  outageReported = true;
  window.dispatchEvent(
    new CustomEvent<SystemUnavailableDetail>(SYSTEM_UNAVAILABLE_EVENT, {
      detail,
    }),
  );
}

/** Paths whose 401 is an answer about credentials, never an expired session. */
const REFRESH_EXEMPT_PATHS: ReadonlySet<string> = new Set([
  "/api/v1/auth/sign-in",
  "/api/v1/auth/refresh",
]);

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly serverCode?: string;
  public readonly details: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    options: { serverCode?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.serverCode = options.serverCode;
    this.details = options.details;
  }
}

function codeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 422:
      return "unprocessable";
    case 429:
      return "rate_limited";
    case 500:
      return "server_error";
    case 502:
    case 503:
    case 504:
      return UNAVAILABLE_ERROR_CODE;
    default:
      return "unknown_error";
  }
}

type QueryParamValue = string | number | boolean | readonly string[] | undefined;

function buildUrl(
  path: string,
  params?: Record<string, QueryParamValue>,
): string {
  const base = env.VITE_API_URL || window.location.origin;
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return;
      // An array is a repeated key (`?k=a&k=b`), the shape FastAPI's
      // `list[...] = Query(None)` reads. Comma-joined lists stay the caller's
      // job, as before. An empty array emits nothing, like `undefined`.
      if (Array.isArray(value)) {
        for (const entry of value) url.searchParams.append(key, entry);
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

/** The backend's code for "cannot validate a session right now" (a 503). */
const AUTH_UNAVAILABLE_SERVER_CODE = "auth_unavailable";

function errorCode(status: number, serverCode: string | undefined): string {
  // Robust to the carrier: whatever status a body naming `auth_unavailable`
  // arrives with, it is an outage, never a credential verdict.
  return serverCode === AUTH_UNAVAILABLE_SERVER_CODE
    ? UNAVAILABLE_ERROR_CODE
    : codeFromStatus(status);
}

/** A FastAPI `HTTPException(detail={"code": ...})` carries its code here. */
function detailServerCode(detail: unknown): string | undefined {
  if (typeof detail !== "object" || detail === null || Array.isArray(detail)) {
    return undefined;
  }
  const code = (detail as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

async function errorFromResponse(response: Response): Promise<ApiRequestError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return new ApiRequestError(
      response.status,
      codeFromStatus(response.status),
      response.statusText,
    );
  }

  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    return new ApiRequestError(
      response.status,
      errorCode(response.status, parsed.data.code),
      parsed.data.error,
      { serverCode: parsed.data.code, details: parsed.data.details },
    );
  }

  // The backend's auth and validation responses intentionally omit `ok` and
  // use `{ detail }` at every status (not only the historical 403 special
  // case). Keep arbitrary detail payloads — FastAPI commonly sends an array
  // for validation failures.
  const detailParsed = DetailErrorSchema.safeParse(body);
  if (detailParsed.success) {
    const detail = detailParsed.data.detail;
    const serverCode = detailServerCode(detail);
    return new ApiRequestError(
      response.status,
      errorCode(response.status, serverCode),
      typeof detail === "string" ? detail : "Request failed.",
      { serverCode, details: detail },
    );
  }

  return new ApiRequestError(
    response.status,
    codeFromStatus(response.status),
    "An unexpected error occurred.",
  );
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, QueryParamValue>;
  /** Explicit classification; unset means the input-based classifier. */
  activity?: RequestActivity;
};

function unavailable(
  status: number,
  path: string,
  activity: RequestActivity,
  error: ApiRequestError,
): ApiRequestError {
  dispatchSystemUnavailable({
    status,
    path,
    background: activity === "background",
  });
  return error;
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { method = "GET", body, params } = options;
  // Resolved once: the refresh a 401 triggers and the replay after it carry
  // the classification of the request that started them.
  const activity = resolveRequestActivity(options.activity);
  const url = buildUrl(path, params);
  const token = getAccessToken();

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        [ACTIVITY_HEADER]: activity,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // An abort is the caller's decision, not an outage: rethrow it untouched.
    if (!isAbortError(error) && error instanceof TypeError) {
      throw unavailable(
        0,
        path,
        activity,
        new ApiRequestError(
          0,
          UNAVAILABLE_ERROR_CODE,
          "The server could not be reached.",
          { details: error.message },
        ),
      );
    }
    throw error;
  }

  if (
    response.status === 401 &&
    !isRetry &&
    !REFRESH_EXEMPT_PATHS.has(new URL(url).pathname)
  ) {
    const rejection = await errorFromResponse(response.clone());
    if (rejection.code === UNAVAILABLE_ERROR_CODE) {
      throw unavailable(response.status, path, activity, rejection);
    }

    const outcome = await refreshAccessToken(undefined, { activity });

    if (outcome === "ok") {
      return request(path, schema, { ...options, activity }, true);
    }

    if (outcome === "unavailable") {
      // The session could not be checked; it may still be valid. Keep the
      // token and report an outage instead of an expired session.
      throw unavailable(
        0,
        path,
        activity,
        new ApiRequestError(
          0,
          UNAVAILABLE_ERROR_CODE,
          "The session could not be verified right now.",
        ),
      );
    }

    setAccessToken(null);
    window.dispatchEvent(new CustomEvent("auth:session-expired"));
    throw new ApiRequestError(
      401,
      "unauthorized",
      "Session expired. Please sign in again.",
    );
  }

  if (!response.ok) {
    const error = await errorFromResponse(response);
    if (error.code === UNAVAILABLE_ERROR_CODE) {
      throw unavailable(response.status, path, activity, error);
    }
    throw error;
  }

  dispatchSystemAvailableIfRecovering();

  let json: unknown;
  try {
    json = response.status === 204 ? {} : await response.json();
  } catch (error) {
    throw new ApiRequestError(
      0,
      INVALID_RESPONSE_ERROR_CODE,
      "API response was not valid JSON.",
      { details: error instanceof Error ? error.message : undefined },
    );
  }
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    throw new ApiRequestError(
      0,
      INVALID_RESPONSE_ERROR_CODE,
      `API response did not match expected schema: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}

/**
 * Every request carries `X-Beyo-Activity`. The trailing `options.activity`
 * overrides the input-based classifier; see `ApiCallOptions`.
 */
export const apiClient = {
  get: <T>(
    path: string,
    schema: z.ZodType<T>,
    params?: RequestOptions["params"],
    options?: ApiCallOptions,
  ) =>
    request(path, schema, {
      method: "GET",
      params,
      activity: options?.activity,
    }),

  post: <T>(
    path: string,
    schema: z.ZodType<T>,
    body: unknown,
    options?: ApiCallOptions,
  ) =>
    request(path, schema, {
      method: "POST",
      body,
      activity: options?.activity,
    }),

  put: <T>(
    path: string,
    schema: z.ZodType<T>,
    body: unknown,
    options?: ApiCallOptions,
  ) =>
    request(path, schema, {
      method: "PUT",
      body,
      activity: options?.activity,
    }),

  patch: <T>(
    path: string,
    schema: z.ZodType<T>,
    body: unknown,
    options?: ApiCallOptions,
  ) =>
    request(path, schema, {
      method: "PATCH",
      body,
      activity: options?.activity,
    }),

  delete: <T>(
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
    params?: RequestOptions["params"],
    options?: ApiCallOptions,
  ) =>
    request(path, schema, {
      method: "DELETE",
      body,
      params,
      activity: options?.activity,
    }),
};
