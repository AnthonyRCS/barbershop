import { requireRole } from "@/lib/rbac";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["OWNER", "ADMIN"]);
  return <>{children}</>;
}
