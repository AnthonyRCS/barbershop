"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5 min before expiry
const CHECK_INTERVAL_MS = 60 * 1000;     // check every 60 s

/**
 * Silently refreshes the JWT before it expires using refresh token rotation.
 * Uses POST /auth/refresh-token (no active access token required).
 * Mount this once inside the authenticated layout.
 */
export function TokenRefresher() {
  const { data: session, update } = useSession();
  const refreshingRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (refreshingRef.current || !session?.user?.token) return;

      try {
        // Decode the JWT to read exp without a library
        const parts = session.user.token.split(".");
        if (parts.length !== 3) return;
        const payload = JSON.parse(atob(parts[1])) as { exp?: number };
        if (!payload.exp) return;

        const expiresAt = payload.exp * 1000;
        const timeLeft = expiresAt - Date.now();

        if (timeLeft > REFRESH_MARGIN_MS) return; // still plenty of time

        refreshingRef.current = true;

        if (timeLeft <= 0 && !session.user.refreshToken) {
          // Expired and no refresh token — sign out
          await signOut({ redirectTo: "/login" });
          return;
        }

        // Use refresh token rotation (does not require a valid access token)
        const refreshToken = session.user.refreshToken;
        if (refreshToken) {
          const res = await fetch("/api/proxy/api/v1/auth/refresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });

          if (res.ok) {
            const data = (await res.json()) as { token?: string; refreshToken?: string };
            if (data.token) {
              await update({ token: data.token, refreshToken: data.refreshToken ?? refreshToken });
            }
            return;
          }
        }

        // Fallback: legacy refresh using active access token
        if (timeLeft > 0) {
          const res = await fetch("/api/proxy/api/v1/auth/refresh", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.user.token}`,
            },
          });

          if (res.ok) {
            const data = (await res.json()) as { token?: string };
            if (data.token) await update({ token: data.token });
            return;
          }
        }

        // Both refresh attempts failed — sign out
        await signOut({ redirectTo: "/login" });
      } catch {
        // Network error — don't sign out, just retry next interval
      } finally {
        refreshingRef.current = false;
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [session, update]);

  return null;
}
