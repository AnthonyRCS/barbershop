import { Role } from "./index";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      businessId: string;
      businessName: string;
      businessSlug: string;
      role: Role;
      name: string;
      token: string;
      refreshToken: string;
      permissions: string[];
      email: string;
      emailVerified: Date | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    businessId: string;
    businessName: string;
    businessSlug: string;
    role: Role;
    name: string;
    token: string;
    refreshToken: string;
    permissions: string[];
  }
}
