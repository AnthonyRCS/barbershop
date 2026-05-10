import { requireRole } from "@/lib/rbac";

export default async function ServicesLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["OWNER", "ADMIN"]);
  return <>{children}</>;
}
