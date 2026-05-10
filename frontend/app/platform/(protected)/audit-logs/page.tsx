import { getPlatformSession } from "@/lib/platform-session";
import { AuditLogsView } from "./AuditLogsView";
import { redirect } from "next/navigation";

export const metadata = { title: "Auditoría — Platform Admin" };

export default async function PlatformAuditLogsPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");
  return <AuditLogsView token={session.token} />;
}
