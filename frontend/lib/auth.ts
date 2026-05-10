import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

type BackendAuthResponse = {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "OWNER" | "ADMIN" | "BARBER" | "RECEPTIONIST";
    permissions: string[];
    business: { id: string; name: string; slug: string; status: string };
  };
};

function getBackendUrl() {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        businessSlug: {},
      },
      async authorize(credentials) {
        try {
          const response = await fetch(`${getBackendUrl()}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              // businessSlug is optional — backend resolves it from email if not provided
              ...(credentials.businessSlug ? { businessSlug: credentials.businessSlug } : {}),
            }),
          });

          const raw = await response.text();
          const data = raw
            ? (JSON.parse(raw) as {
                token?: string;
                refreshToken?: string;
                user?: {
                  id: string;
                  name: string;
                  email: string;
                  role: "OWNER" | "ADMIN" | "BARBER" | "RECEPTIONIST";
                  permissions?: string[];
                  business: { id: string; name: string; slug: string; status: string };
                };
                error?: { code?: string; message?: string; payload?: unknown };
              })
            : null;

          if (!response.ok || !data?.token || !data?.user) {
            if (process.env.NODE_ENV !== "production") {
              console.error("[NextAuth] login failed:", {
                status: response.status,
                error: data?.error,
              });
            }
            return null;
          }

          return {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            emailVerified: null,
            role: data.user.role,
            permissions: data.user.permissions ?? [],
            businessId: data.user.business.id,
            businessName: data.user.business.name,
            businessSlug: data.user.business.slug,
            token: data.token,
            refreshToken: data.refreshToken ?? "",
          };
        } catch (error) {
          console.error("[NextAuth] authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.businessId = (user as { businessId: string }).businessId;
        token.businessName = (user as { businessName: string }).businessName;
        token.businessSlug = (user as { businessSlug: string }).businessSlug;
        token.role = (user as { role: "OWNER" | "ADMIN" | "BARBER" | "RECEPTIONIST" }).role;
        token.name = user.name ?? "";
        token.token = (user as { token: string }).token;
        token.refreshToken = (user as { refreshToken?: string }).refreshToken ?? "";
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
        token.email = user.email ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: String(token.id ?? ""),
        businessId: String(token.businessId ?? ""),
        businessName: String(token.businessName ?? ""),
        businessSlug: String(token.businessSlug ?? ""),
        role: token.role as "OWNER" | "ADMIN" | "BARBER" | "RECEPTIONIST",
        name: String(token.name ?? ""),
        token: String(token.token ?? ""),
        refreshToken: String(token.refreshToken ?? ""),
        permissions: (token.permissions as string[]) ?? [],
        email: String(token.email ?? ""),
        emailVerified: null,
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
