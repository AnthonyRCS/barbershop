import { redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platform-session";
import { PlatformLayoutClient } from "@/components/platform/PlatformLayoutClient";

export const metadata = {
  title: "Platform Admin — Barbershop SaaS",
};

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getPlatformSession();
  if (!session) {
    redirect("/platform/login");
  }

  return (
    <PlatformLayoutClient user={session}>
      {children}
    </PlatformLayoutClient>
  );
}
