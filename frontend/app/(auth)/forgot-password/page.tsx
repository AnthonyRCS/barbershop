"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Scissors } from "lucide-react";
import Link from "next/link";
import { Input, Label } from "@/components/ui";

const schema = z.object({
  email: z.string().email("Email inválido"),
  businessSlug: z.string().min(2, "Ingresa el slug de tu negocio"),
});

type FormValues = z.infer<typeof schema>;

const BACKEND = "/api/proxy";

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setServerError("");
    try {
      const res = await fetch(`${BACKEND}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as { message?: string; resetToken?: string };
      if (!res.ok) {
        setServerError(json.message ?? "Error al enviar la solicitud.");
        return;
      }
      setDone(true);
      if (json.resetToken) setDevToken(json.resetToken);
    } catch {
      setServerError("Error de conexión. Verifica que el servidor esté activo.");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4">
      <div className="bg-grid-indigo-soft pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-indigo-900/50">
            <Scissors className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Barbershop Pro</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Recuperación de contraseña</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
          {done ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <p className="text-sm text-zinc-200">
                  Si el email existe, recibirás un enlace de recuperación.
                </p>
              </div>

              {/* Dev-only: show token so it can be tested without email */}
              {devToken && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Solo en desarrollo
                  </p>
                  <p className="break-all font-mono text-[11px] text-amber-300">{devToken}</p>
                  <a
                    href={`/reset-password?token=${devToken}`}
                    className="mt-2 inline-block text-xs text-primary hover:text-primary/80"
                  >
                    Ir a restablecer contraseña →
                  </a>
                </div>
              )}

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-sm font-semibold text-zinc-200">¿Olvidaste tu contraseña?</h2>
              <p className="mb-5 text-xs text-zinc-500">
                Ingresa tu email y el slug de tu negocio para recibir un enlace de recuperación.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="tu@email.com" {...register("email")} />
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                </div>

                <div>
                  <Label htmlFor="businessSlug">Slug del negocio</Label>
                  <Input id="businessSlug" placeholder="mi-barberia" {...register("businessSlug")} />
                  {errors.businessSlug && (
                    <p className="mt-1 text-xs text-red-400">{errors.businessSlug.message}</p>
                  )}
                </div>

                {serverError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                    <p className="text-xs text-red-400">{serverError}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isSubmitting ? "Enviando..." : "Enviar enlace"}
                </button>

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

