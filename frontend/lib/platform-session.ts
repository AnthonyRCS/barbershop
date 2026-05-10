import { cookies } from "next/headers";
import { PLATFORM_COOKIE, PlatformSessionUser } from "./platform-auth";

/**
 * Server-side: reads the platform token cookie and fetches /platform/auth/me
 * to validate it and get the current platform user.
 *
 * Returns null if no token or token is invalid.
 */
export async function getPlatformSession(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookieStore?: any,
): Promise<PlatformSessionUser | null> {
  try {
    const store = cookieStore ?? (await cookies());
    const token = store.get(PLATFORM_COOKIE)?.value;
    if (!token) return null;

    const res = await fetch(`${process.env.BACKEND_URL}/api/v1/platform/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { user: PlatformSessionUser };
    return { ...data.user, token };
  } catch {
    return null;
  }
}
