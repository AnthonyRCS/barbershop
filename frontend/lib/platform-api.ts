"use client";

export class PlatformAPIError extends Error {
  public code: string;
  public statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

const baseUrl =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001")
    : (process.env.BACKEND_URL ?? "http://localhost:3001");

async function request<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/platform/login";
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = (payload as { error?: { code?: string } })?.error?.code ?? "API_ERROR";
    const message =
      (payload as { error?: { message?: string } })?.error?.message ?? "Request failed";
    throw new PlatformAPIError(code, message, response.status);
  }

  return payload as T;
}

export function createPlatformApi(token: string) {
  const base = "/api/v1/platform";
  return {
    get<T>(path: string): Promise<T> {
      return request<T>("GET", `${base}${path}`, token);
    },
    post<T>(path: string, body: unknown): Promise<T> {
      return request<T>("POST", `${base}${path}`, token, body);
    },
    patch<T>(path: string, body: unknown): Promise<T> {
      return request<T>("PATCH", `${base}${path}`, token, body);
    },
    delete<T>(path: string): Promise<T> {
      return request<T>("DELETE", `${base}${path}`, token);
    },
  };
}
