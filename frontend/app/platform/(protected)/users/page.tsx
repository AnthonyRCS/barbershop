import { getPlatformSession } from "@/lib/platform-session";
import { UsersView } from "./UsersView";
import { redirect } from "next/navigation";

export const metadata = { title: "Usuarios — Platform Admin" };

export default async function PlatformUsersPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");
  return <UsersView token={session.token} currentUserId={session.id} />;
}
