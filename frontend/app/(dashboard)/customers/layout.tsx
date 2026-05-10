import { CUSTOMER_ROLES, requireRole } from "@/lib/rbac";

export default async function CustomersLayout({ children }: { children: React.ReactNode }) {
  await requireRole(CUSTOMER_ROLES);
  return <>{children}</>;
}
