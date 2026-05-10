"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Scissors } from "lucide-react";
import Link from "next/link";
import { Input, Label } from "@/components/ui";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    passwordConfirm: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirm"],
  });

type FormValues = z.infer<typeof schema>;

const BACKEND = "/api/proxy";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
  }, []);

  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setServerError("");
    if (!token) {
      setServerError("Token inválido o expirado.");
      return;
    }
    try {
      const res = await fetch(`${BACKEND}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password, passwordConfirm: data.passwordConfirm }),
      });
      const json = (await res.json()) as { message?: string; error?: { message?: string } };
      if (!res.ok) {
        setServerError(json.error?.message ?? json.message ?? "Error al restablecer la contraseña.");
        return;
      }
      setDone(true);
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
            <p className="mt-0.5 text-sm text-zinc-500">Nueva contraseña</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
          {!token ? (
            <div className="space-y-4 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
              <p className="text-sm text-zinc-300">Token inválido o expirado.</p>
              <a href="/forgot-password" className="text-sm text-primary hover:text-primary/80">
                Solicitar nuevo enlace
              </a>
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <p className="text-sm text-zinc-200">
                ¡Contraseña actualizada exitosamente!
              </p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Ir al login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-sm font-semibold text-zinc-200">Restablecer contraseña</h2>
              <p className="mb-5 text-xs text-zinc-500">
                Elige una contraseña segura (mín. 8 caracteres, mayúscula, número y símbolo).
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
                </div>

                <div>
                  <Label htmlFor="passwordConfirm">Confirmar contraseña</Label>
                  <div className="relative">
                    <Input
                      id="passwordConfirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10"
                      {...register("passwordConfirm")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.passwordConfirm && (
                    <p className="mt-1 text-xs text-red-400">{errors.passwordConfirm.message}</p>
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
                  {isSubmitting ? "Guardando..." : "Guardar contraseña"}
                </button>

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Cancelar
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

