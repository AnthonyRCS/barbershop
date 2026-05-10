import { NextRequest, NextResponse } from "next/server";

// BACKEND_URL is server-only (not exposed to the client bundle).
// Force local loopback by default to avoid mixing different backend instances
// (for example localhost/IPv6 or a stale LAN backend with another JWT secret).
const backendBaseUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:3001";

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  retries = 1,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, 180));
    return fetchWithRetry(input, init, retries - 1);
  }
}

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  try {
    const targetPath = path.join("/");
    const search = request.nextUrl.search;
    const targetUrl = `${backendBaseUrl}/${targetPath}${search}`;

    const headers = new Headers();
    const auth = request.headers.get("authorization");
    const contentType = request.headers.get("content-type");
    const cookie = request.headers.get("cookie");
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    const idempotencyKey = request.headers.get("idempotency-key");
    if (auth) headers.set("authorization", auth);
    if (contentType) headers.set("content-type", contentType);
    if (cookie) headers.set("cookie", cookie);
    headers.set("x-request-id", requestId);
    if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);

    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text();

    const response = await fetchWithRetry(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    }, request.method === "GET" || request.method === "HEAD" ? 1 : 0);

    const responseBody = await response.text();
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "PROXY_ERROR",
          message: error instanceof Error ? error.message : "Unknown proxy error",
        },
      },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxy(request, path);
}
