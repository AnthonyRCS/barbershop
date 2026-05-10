"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type State = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setState("error");
      setMessage("Token de verificación no encontrado.");
      return;
    }

    void (async () => {
      try {
        const res = await fetch("/api/proxy/api/v1/customer-portal/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const payload = (await res.json()) as { message?: string; error?: { message?: string } };

        if (res.ok) {
          setState("success");
          setMessage(payload.message ?? "Email verificado correctamente.");
          setTimeout(() => router.replace("/customer/login" as never), 3000);
        } else {
          setState("error");
          setMessage(payload.error?.message ?? "El enlace de verificación no es válido o expiró.");
        }
      } catch {
        setState("error");
        setMessage("Error de conexión. Intenta de nuevo.");
      }
    })();
  }, [searchParams, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="text-center">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-zinc-400">Verificando tu email...</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
            <h2 className="text-lg font-semibold text-zinc-100">¡Email verificado!</h2>
            <p className="mt-2 text-sm text-zinc-400">{message}</p>
            <p className="mt-1 text-xs text-zinc-500">Redirigiendo al inicio de sesión...</p>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Error de verificación</h2>
            <p className="mt-2 text-sm text-zinc-400">{message}</p>
            <a
              href="/customer/login"
              className="mt-4 inline-block text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Ir al inicio de sesión
            </a>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-zinc-400">Verificando tu email...</p>
          </div>
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

