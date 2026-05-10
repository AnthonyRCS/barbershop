import { NextRequest, NextResponse } from "next/server";
import { PLATFORM_COOKIE } from "@/lib/platform-auth";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email: string; password: string };

  const backendRes = await fetch(
    `${process.env.BACKEND_URL}/api/v1/platform/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!backendRes.ok) {
    const err = await backendRes.json().catch(() => ({}));
    return NextResponse.json(err, { status: backendRes.status });
  }

  const data = (await backendRes.json()) as {
    token: string;
    user: { id: string; name: string; email: string; role: string };
  };

  const response = NextResponse.json({ user: data.user });

  response.cookies.set(PLATFORM_COOKIE, data.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return response;
}
