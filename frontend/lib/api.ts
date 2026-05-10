import { getSession } from "next-auth/react";
import { generateUuid } from "@/lib/uuid";

export class APIError extends Error {
  public code: string;
  public statusCode: number;
  public requestId?: string;

  constructor(code: string, message: string, statusCode: number, requestId?: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

const proxyBaseUrl = "/api/proxy";

interface RequestOptions {
  /** UUID sent as Idempotency-Key header — the backend deduplicates on this key */
  idempotencyKey?: string;
}

function generateRequestId(): string {
  return generateUuid();
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  const session = await getSession();
  const token = session?.user?.token;
  const requestId = generateRequestId();

  let response: Response;
  try {
    response = await fetch(`${proxyBaseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  } catch {
    throw new APIError(
      "NETWORK_ERROR",
      "No se pudo conectar con el backend. Verifica que el backend esté corriendo.",
      0,
      requestId,
    );
  }

  const serverRequestId = response.headers.get("X-Request-Id") ?? requestId;

  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = payload?.error?.code ?? "API_ERROR";
    const message = payload?.error?.message ?? "Request failed";
    throw new APIError(code, message, response.status, serverRequestId);
  }

  return payload as T;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>("GET", path);
  },
  post<T>(path: string, body: unknown, opts?: RequestOptions): Promise<T> {
    return request<T>("POST", path, body, opts);
  },
  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>("PUT", path, body);
  },
  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>("PATCH", path, body);
  },
  delete<T>(path: string): Promise<T> {
    return request<T>("DELETE", path);
  },
};
