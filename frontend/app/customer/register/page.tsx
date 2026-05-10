"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Scissors } from "lucide-react";
import { Input, Label } from "@/components/ui";

const schema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const TOKEN_KEY = "customer_portal_token";

function CustomerRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = useMemo(() => searchParams.get("inviteToken") ?? "", [searchParams]);
  const invitedEmail = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: invitedEmail, password: "", phone: "" },
  });

  async function onSubmit(data: FormValues) {
    setServerError("");
    try {
      const endpoint = inviteToken
        ? "/api/proxy/api/v1/customer-portal/auth/claim-account"
        : "/api/proxy/api/v1/customer-portal/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(inviteToken ? { token: inviteToken } : { name: data.name }),
          email: data.email,
          password: data.password,
          ...(data.phone ? { phone: data.phone } : {}),
        }),
      });
      const payload = (await res.json()) as { token?: string; error?: { message?: string } };

      if (!res.ok) {
        setServerError(payload.error?.message ?? "Error al registrarse");
        return;
      }

      if (payload.token) {
        sessionStorage.setItem(TOKEN_KEY, payload.token);
        setSuccess(true);
        setTimeout(() => router.replace("/customer/appointments" as never), 2000);
      } else {
        // Email verification required
        setSuccess(true);
      }
    } catch {
      setServerError("Error de conexión. Intenta de nuevo.");
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
          <h2 className="text-lg font-semibold text-zinc-100">¡Registro exitoso!</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Revisa tu email para verificar tu cuenta. Redirigiendo...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4">
      <div className="bg-grid-indigo-soft pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-900/60 ring-1 ring-indigo-400/20">
            <Scissors className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Portal de Clientes</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Crea tu cuenta para gestionar tus citas</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-2xl shadow-black/50 backdrop-blur-sm">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="text-sm font-semibold text-zinc-200">Crear cuenta</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
            <div>
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                placeholder="Juan Pérez"
                autoFocus
                {...register("name")}
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="phone">Teléfono <span className="text-zinc-500">(opcional)</span></Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+51 999 000 000"
                {...register("phone")}
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                <p className="text-xs text-red-400">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-600">
          ¿Ya tienes cuenta?{" "}
          <a href="/customer/login" className="font-medium text-primary transition-colors hover:text-primary/80">
            Iniciar sesión
          </a>
        </p>
      </div>
    </main>
  );
}

export default function CustomerRegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
      }
    >
      <CustomerRegisterForm />
    </Suspense>
  );
}

