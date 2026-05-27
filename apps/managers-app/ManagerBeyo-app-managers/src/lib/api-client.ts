import { z } from "zod";
import { env } from "@/lib/env";
import {
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "@/lib/auth-token";
import { ApiErrorSchema } from "@/types/api";

const RateLimitErrorSchema = z.object({ detail: z.string() });

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
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
      return "network_error";
    default:
      return "unknown_error";
  }
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const base = env.VITE_API_URL || window.location.origin;
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function handleErrorResponse(response: Response): Promise<never> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiRequestError(
      response.status,
      codeFromStatus(response.status),
      response.statusText,
    );
  }

  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    throw new ApiRequestError(
      response.status,
      codeFromStatus(response.status),
      parsed.data.error,
    );
  }

  const rateLimitParsed = RateLimitErrorSchema.safeParse(body);
  if (rateLimitParsed.success) {
    throw new ApiRequestError(
      response.status,
      codeFromStatus(response.status),
      rateLimitParsed.data.detail,
    );
  }

  throw new ApiRequestError(
    response.status,
    codeFromStatus(response.status),
    "An unexpected error occurred.",
  );
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
};

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { method = "GET", body, params } = options;
  const url = buildUrl(path, params);
  const token = getAccessToken();

  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return request(path, schema, options, true);
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
    return handleErrorResponse(response);
  }

  const json: unknown = response.status === 204 ? {} : await response.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    throw new ApiRequestError(
      502,
      "invalid_response",
      `API response did not match expected schema: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}

export const apiClient = {
  get: <T>(
    path: string,
    schema: z.ZodType<T>,
    params?: RequestOptions["params"],
  ) => request(path, schema, { method: "GET", params }),

  post: <T>(path: string, schema: z.ZodType<T>, body: unknown) =>
    request(path, schema, { method: "POST", body }),

  put: <T>(path: string, schema: z.ZodType<T>, body: unknown) =>
    request(path, schema, { method: "PUT", body }),

  patch: <T>(path: string, schema: z.ZodType<T>, body: unknown) =>
    request(path, schema, { method: "PATCH", body }),

  delete: <T>(
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
    params?: RequestOptions["params"],
  ) => request(path, schema, { method: "DELETE", body, params }),
};
