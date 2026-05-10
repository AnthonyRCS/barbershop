import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal de Clientes | Barbershop Pro",
  description: "Gestiona tus citas y tu historial en línea",
};

export default function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      {children}
    </div>
  );
}
