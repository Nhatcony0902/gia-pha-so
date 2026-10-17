import type { ApiErrorResponse, AuthResponse } from "@family-tree/shared-types";

const apiUrl = import.meta.env.VITE_API_URL ?? "/api";
let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

async function parse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    T | ApiErrorResponse | null;
  if (!response.ok) {
    const error = (body as ApiErrorResponse | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? `HTTP_${response.status}`,
      error?.message ?? "Không thể kết nối máy chủ",
    );
  }
  return body as T;
}

export async function publicApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  return parse<T>(
    await fetch(`${apiUrl}${path}`, {
      ...init,
      headers,
      credentials: "include",
    }),
  );
}

export async function refreshAccessToken(): Promise<AuthResponse> {
  refreshPromise ??= publicApi<AuthResponse>("/auth/refresh", {
    method: "POST",
  })
    .then((result) => {
      setAccessToken(result.accessToken);
      return result;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  canRetry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (response.status === 401 && canRetry && !path.startsWith("/auth/")) {
    try {
      await refreshAccessToken();
      return apiRequest<T>(path, init, false);
    } catch {
      setAccessToken(null);
      sessionExpiredHandler?.();
    }
  }
  return parse<T>(response);
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}
export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}
export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}
