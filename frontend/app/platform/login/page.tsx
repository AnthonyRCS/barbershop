import { redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platform-session";
import { PlatformLoginForm } from "./PlatformLoginForm";

export const metadata = {
  title: "Platform Login — Barbershop SaaS",
};

export default async function PlatformLoginPage() {
  const session = await getPlatformSession();
  if (session) {
    redirect("/platform");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="bg-grid-indigo-soft fixed inset-0 opacity-[0.03]" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/25 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Control</h1>
          <p className="text-sm text-zinc-500 mt-1">Acceso exclusivo para administradores de la plataforma</p>
        </div>

        <PlatformLoginForm />

        <p className="text-center text-xs text-zinc-700 mt-6">
          Barbershop SaaS — Panel de Superadministración
        </p>
      </div>
    </div>
  );
}


