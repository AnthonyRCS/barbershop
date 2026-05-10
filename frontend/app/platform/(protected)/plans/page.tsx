import { getPlatformSession } from "@/lib/platform-session";
import { PlansView } from "./PlansView";
import { redirect } from "next/navigation";

export const metadata = { title: "Planes — Platform Admin" };

export default async function PlatformPlansPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");
  return <PlansView token={session.token} />;
}
