import { getPlatformSession } from "@/lib/platform-session";
import { SubscriptionsView } from "./SubscriptionsView";
import { redirect } from "next/navigation";

export const metadata = { title: "Suscripciones — Platform Admin" };

export default async function PlatformSubscriptionsPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");
  return <SubscriptionsView token={session.token} />;
}
