"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Scissors,
} from "lucide-react";
import { Input, Label } from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessOption {
  slug: string;
  name: string;
  status: string;
}

type LookupStatus = "idle" | "loading" | "found" | "multiple" | "not_found" | "error";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
  slug: z.string().min(1, "Escribe el slug de tu negocio"),
});
type FormValues = z.infer<typeof schema>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function lookupEmailApi(email: string): Promise<BusinessOption[]> {
  try {
    const res = await fetch("/api/proxy/api/v1/auth/lookup-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { businesses?: BusinessOption[] };
    return data.businesses ?? [];
  } catch {
    return [];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prefillDoneRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", slug: "" },
  });

  const emailValue = watch("email");
  const slugValue = watch("slug");


  // Prefill from URL params (legacy GET)
  useEffect(() => {
    if (prefillDoneRef.current) return;
    prefillDoneRef.current = true;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const emailFromUrl = (params.get("email") ?? "").trim();
    const slugFromUrl = (params.get("slug") ?? params.get("businessSlug") ?? "").trim();
    const passwordFromUrl = params.get("password") ?? "";

    if (emailFromUrl) setValue("email", emailFromUrl, { shouldValidate: true, shouldDirty: true });
    if (slugFromUrl) setValue("slug", slugFromUrl, { shouldValidate: true, shouldDirty: true });
    if (passwordFromUrl) setValue("password", passwordFromUrl, { shouldValidate: true, shouldDirty: true });

  }, [setValue]);

  // Auto-detect business when email changes
  useEffect(() => {
    const email = (emailValue ?? "").trim();
    if (!EMAIL_RE.test(email)) {
      setLookupStatus("idle");
      setBusinesses([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLookupStatus("loading");
      const result = await lookupEmailApi(email);
      if (result.length === 0) {
        setLookupStatus("not_found");
        setBusinesses([]);
      } else if (result.length === 1) {
        setLookupStatus("found");
        setBusinesses(result);
        setValue("slug", result[0].slug, { shouldValidate: true });
      } else {
        setLookupStatus("multiple");
        setBusinesses(result);
        setValue("slug", result[0].slug, { shouldValidate: true });
      }
    }, 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [emailValue, setValue]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(data: FormValues) {
    setServerError("");
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        businessSlug: data.slug,
        redirect: false,
      });
      if (!result?.ok || result.error) {
        setServerError("Credenciales inválidas. Verifica tu email y contraseña.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setServerError("Error de conexión. Verifica que el servidor esté activo.");
    }
  }


  // ── Render ────────────────────────────────────────────────────────────────

  const selectedBusiness = businesses.find((b) => b.slug === slugValue) ?? null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4">
      {/* Grid background */}
      <div className="bg-grid-indigo-soft pointer-events-none absolute inset-0 opacity-30" />
      {/* Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-900/60 ring-1 ring-indigo-400/20">
            <Scissors className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Barbershop Pro</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Gestión profesional para tu barbería</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-2xl shadow-black/50 backdrop-blur-sm">
          {/* Card header */}
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="text-sm font-semibold text-zinc-200">Iniciar sesión</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Accede a tu panel de barbería</p>
          </div>

          <div className="p-6 space-y-4">

            {/* Form */}
            <div
              className="space-y-4"
              onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(onSubmit)(); }}
            >
              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="owner@negocio.com"
                  autoComplete="email"
                  autoFocus
                  {...register("email")}
                />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>

              {/* Business slug */}
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="slug">Negocio (slug)</Label>
                  {lookupStatus === "loading" && (
                    <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
                  )}
                  {lookupStatus === "found" && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Detectado automáticamente
                    </span>
                  )}
                </div>

                {lookupStatus === "multiple" ? (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowDropdown((v) => !v)}
                      className="flex w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-600"
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        {selectedBusiness?.name ?? slugValue ?? "Seleccionar negocio"}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
                    </button>
                    {showDropdown && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                        {businesses.map((b) => (
                          <button
                            key={b.slug}
                            type="button"
                            onClick={() => {
                              setValue("slug", b.slug, { shouldValidate: true });
                              setShowDropdown(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-700"
                          >
                            <Building2 className="h-4 w-4 text-primary" />
                            {b.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Input
                    id="slug"
                    placeholder="ej: el-maestro"
                    autoComplete="off"
                    {...register("slug")}
                  />
                )}

                {errors.slug && <p className="mt-1 text-xs text-red-400">{errors.slug.message}</p>}
                <p className="mt-1 text-[10px] text-zinc-600">
                  {lookupStatus === "found"
                    ? `Negocio: ${selectedBusiness?.name ?? slugValue}`
                    : lookupStatus === "not_found"
                    ? "Email no registrado en ningún negocio"
                    : "Se detecta automáticamente al escribir tu email"}
                </p>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <a
                    href="/forgot-password"
                    className="text-[11px] text-primary transition-colors hover:text-primary/80"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
              </div>

              {/* Server error */}
              {serverError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 animate-fade-in">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                  <p className="text-xs text-red-400">{serverError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSubmit(onSubmit)()}
                className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98] active:bg-primary/80 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "Iniciando sesión..." : "Entrar al panel"}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-600">
          ¿No tienes cuenta?{" "}
          <a href="/register" className="font-medium text-primary transition-colors hover:text-primary/80">
            Registra tu barbería gratis
          </a>
        </p>
        <p className="mt-2 text-center text-xs text-zinc-600">
          Eres cliente?{" "}
          <a href="/customer/login" className="font-medium text-primary transition-colors hover:text-primary/80">
            Entrar como cliente
          </a>
          {" "}o{" "}
          <a href="/customer/register" className="font-medium text-primary transition-colors hover:text-primary/80">
            crear cuenta de cliente
          </a>
        </p>
      </div>
    </main>
  );
}

