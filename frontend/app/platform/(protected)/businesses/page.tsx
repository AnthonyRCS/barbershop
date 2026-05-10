import { getPlatformSession } from "@/lib/platform-session";
import { BusinessesView } from "./BusinessesView";
import { redirect } from "next/navigation";

export const metadata = { title: "Barberías — Platform Admin" };

export default async function PlatformBusinessesPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");
  return <BusinessesView token={session.token} />;
}
