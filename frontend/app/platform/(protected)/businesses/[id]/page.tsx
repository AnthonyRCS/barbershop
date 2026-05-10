import { getPlatformSession } from "@/lib/platform-session";
import { BusinessDetailView } from "./BusinessDetailView";
import { redirect } from "next/navigation";

export const metadata = { title: "Detalle — Platform Admin" };

export default async function PlatformBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([getPlatformSession(), params]);
  if (!session) redirect("/platform/login");
  return <BusinessDetailView token={session.token} businessId={id} />;
}
