import { getPlatformSession } from "@/lib/platform-session";
import { PlatformDashboard } from "./PlatformDashboard";
import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard — Platform Admin" };

export default async function PlatformDashboardPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");
  return <PlatformDashboard token={session.token} user={session} />;
}
