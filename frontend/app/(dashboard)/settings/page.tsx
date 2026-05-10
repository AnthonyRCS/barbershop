"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  UserCircle2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Input, Label } from "@/components/ui";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { api } from "@/lib/api";
import type { Business, BusinessHour } from "@/types";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contrasena actual"),
    newPassword: z.string().min(8, "Minimo 8 caracteres"),
    newPasswordConfirm: z.string().min(1, "Confirma tu nueva contrasena"),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: "Las contrasenas no coinciden",
    path: ["newPasswordConfirm"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code) as [string, ...string[]];

const businessSchema = z.object({
  name: z.string().min(2, "Minimo 2 caracteres"),
  phone: z.string().min(6, "Minimo 6 caracteres"),
  email: z.string().email("Email invalido"),
  address: z.string().min(5, "Minimo 5 caracteres"),
  currency: z.enum(CURRENCY_CODES as [string, ...string[]]).default("PEN"),
  appointmentIntervalMinutes: z
    .number()
    .int("Debe ser entero")
    .min(5, "Minimo 5")
    .max(120, "Maximo 120")
    .refine((value) => value % 5 === 0, "Debe ser multiplo de 5"),
});

type BusinessFormValues = z.infer<typeof businessSchema>;

function Island({ id, title, subtitle, icon, children, className }: {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-neutral-800 dark:bg-neutral-900", className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-700 dark:bg-neutral-800">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { setCurrency } = useCurrency();

  const [business, setBusiness] = useState<Business | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [businessDone, setBusinessDone] = useState(false);
  const [businessError, setBusinessError] = useState("");

  const businessForm = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      currency: "PEN",
      appointmentIntervalMinutes: 20,
    },
  });

  useEffect(() => {
    api.get<Business>("/api/v1/business/me").then((data) => {
      setBusiness(data);
      setLogoUrl(data.logoUrl);
      businessForm.reset({
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        currency: data.currency ?? "PEN",
        appointmentIntervalMinutes: data.appointmentIntervalMinutes ?? 20,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { logoUrl?: string; error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? "Error al subir el logo");
      setLogoUrl(data.logoUrl ?? null);
    } finally {
      setLogoUploading(false);
    }
  }

  async function onBusinessSubmit(data: BusinessFormValues) {
    setBusinessError("");
    setBusinessDone(false);
    try {
      const updated = await api.put<Business>("/api/v1/business/me", data);
      setBusiness(updated);
      if (updated.currency) setCurrency(updated.currency);
      setBusinessDone(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setBusinessError(e?.message ?? "Error al actualizar el negocio.");
    }
  }

  const [passwordDone, setPasswordDone] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  async function onPasswordSubmit(data: PasswordFormValues) {
    setPasswordError("");
    setPasswordDone(false);
    try {
      await api.post("/api/v1/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        newPasswordConfirm: data.newPasswordConfirm,
      });
      setPasswordDone(true);
      resetPassword();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setPasswordError(e?.message ?? "Error al cambiar la contrasena.");
    }
  }

  const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
  const DEFAULT_HOURS: BusinessHour[] = DAY_NAMES.map((_, i) => ({
    dayOfWeek: i,
    openTime: "09:00",
    closeTime: "18:00",
    isOpen: i !== 0,
  }));

  const [hours, setHours] = useState<BusinessHour[]>(DEFAULT_HOURS);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursDone, setHoursDone] = useState(false);
  const [hoursError, setHoursError] = useState("");

  useEffect(() => {
    api
      .get<BusinessHour[]>("/api/v1/business/me/hours")
      .then((data) => {
        if (Array.isArray(data) && data.length === 7) {
          setHours(data);
        }
      })
      .catch(() => {
        // keep defaults
      });
  }, []);

  function updateHour(index: number, field: keyof BusinessHour, value: unknown) {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  }

  async function saveHours() {
    setHoursSaving(true);
    setHoursError("");
    setHoursDone(false);
    try {
      await api.put("/api/v1/business/me/hours", hours);
      setHoursDone(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setHoursError(e?.message ?? "Error al guardar los horarios.");
    } finally {
      setHoursSaving(false);
    }
  }

  const canEditBusiness = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";
  const sectionLinks: { href: string; label: string }[] = [
    { href: "#cuenta", label: "Cuenta" },
    ...(canEditBusiness ? [{ href: "#negocio", label: "Negocio" }] : []),
    ...(canEditBusiness ? [{ href: "#horarios", label: "Horarios" }] : []),
    { href: "#seguridad", label: "Seguridad" },
  ];

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-7 xl:px-8">
      <div className="w-full space-y-4">
        <header className="rounded-2xl border border-neutral-200/80 bg-gradient-to-br from-white via-sky-50 to-cyan-50 p-5 dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-cyan-950/20">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Configuracion</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Panel simple y rapido para administrar tu cuenta.</p>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {sectionLinks.map((link) => (
              <a key={link.href} href={link.href} className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                {link.label}
              </a>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-5 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Secciones</p>
              <nav className="space-y-1">
                {sectionLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-4">
            <Island
              id="cuenta"
              title="Informacion de cuenta"
              subtitle="Datos de tu sesion actual"
              icon={<UserCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />}
            >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Nombre</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{session?.user?.name ?? "-"}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Email</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{session?.user?.email ?? "-"}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Rol</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{session?.user?.role ?? "-"}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Negocio</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{session?.user?.businessName ?? "-"}</p>
              </div>
            </div>
            </Island>

            {canEditBusiness ? (
              <Island
                id="negocio"
                title="Perfil del negocio"
                subtitle="Logo, datos y moneda"
                icon={<Building2 className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />}
              >
              {businessDone ? (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Negocio actualizado correctamente.
                </div>
              ) : null}

              <div className="space-y-4">
                <ImageUpload
                  currentUrl={logoUrl}
                  onUpload={handleLogoUpload}
                  uploading={logoUploading}
                  label="Logo del negocio"
                  hint="PNG, JPG o WEBP - max. 5 MB"
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="biz-name">Nombre del negocio</Label>
                    <Input id="biz-name" placeholder="Mi Barberia" {...businessForm.register("name")} />
                    {businessForm.formState.errors.name ? <p className="mt-1 text-xs text-red-500">{businessForm.formState.errors.name.message}</p> : null}
                  </div>
                  <div>
                    <Label htmlFor="biz-phone">Telefono</Label>
                    <Input id="biz-phone" placeholder="+51 999 999 999" {...businessForm.register("phone")} />
                    {businessForm.formState.errors.phone ? <p className="mt-1 text-xs text-red-500">{businessForm.formState.errors.phone.message}</p> : null}
                  </div>
                  <div>
                    <Label htmlFor="biz-email">Email de contacto</Label>
                    <Input id="biz-email" type="email" placeholder="contacto@negocio.com" {...businessForm.register("email")} />
                    {businessForm.formState.errors.email ? <p className="mt-1 text-xs text-red-500">{businessForm.formState.errors.email.message}</p> : null}
                  </div>
                  <div>
                    <Label htmlFor="biz-address">Direccion</Label>
                    <Input id="biz-address" placeholder="Calle Principal 123" {...businessForm.register("address")} />
                    {businessForm.formState.errors.address ? <p className="mt-1 text-xs text-red-500">{businessForm.formState.errors.address.message}</p> : null}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-cyan-500" />
                    <Label htmlFor="biz-currency" className="mb-0">Moneda del negocio</Label>
                  </div>
                  <select
                    id="biz-currency"
                    {...businessForm.register("currency")}
                    className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} - {c.name} ({c.symbol})</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-neutral-500">Afecta el formato de precios en toda la app.</p>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-cyan-500" />
                    <Label htmlFor="biz-interval" className="mb-0">Intervalo de agenda</Label>
                  </div>
                  <select
                    id="biz-interval"
                    value={businessForm.watch("appointmentIntervalMinutes") ?? 20}
                    onChange={(e) =>
                      businessForm.setValue("appointmentIntervalMinutes", Number(e.target.value), {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    {[5, 10, 15, 20, 30, 45, 60].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        Cada {minutes} minutos
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-neutral-500">
                    Define cada cuantos minutos empieza un nuevo espacio en la agenda (la duracion sigue viniendo del servicio).
                  </p>
                  {businessForm.formState.errors.appointmentIntervalMinutes ? (
                    <p className="mt-1 text-xs text-red-500">
                      {businessForm.formState.errors.appointmentIntervalMinutes.message}
                    </p>
                  ) : null}
                </div>

                {businessError ? (
                  <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-500">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {businessError}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={businessForm.handleSubmit(onBusinessSubmit)}
                  disabled={businessForm.formState.isSubmitting}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
                >
                  {businessForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {businessForm.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
              </Island>
            ) : null}

            {canEditBusiness ? (
              <Island
                id="horarios"
                title="Horarios de atencion"
                subtitle="En movil, cada dia esta separado como isla"
                icon={<Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />}
              >
              {hoursDone ? (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Horarios guardados correctamente.
                </div>
              ) : null}

              <div className="space-y-2.5">
                {hours.map((h, i) => (
                  <div
                    key={h.dayOfWeek}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{DAY_NAMES[h.dayOfWeek]}</span>
                      <button
                        type="button"
                        onClick={() => updateHour(i, "isOpen", !h.isOpen)}
                        className={`relative flex h-5 w-10 items-center rounded-full transition-colors ${h.isOpen ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-600"}`}
                      >
                        <span className={`absolute h-3.5 w-3.5 rounded-full bg-white transition-transform ${h.isOpen ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {h.isOpen ? (
                      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <input
                          type="time"
                          value={h.openTime}
                          onChange={(e) => updateHour(i, "openTime", e.target.value)}
                          className="h-10 rounded-xl border border-neutral-300 bg-white px-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                        />
                        <span className="text-xs text-neutral-500">a</span>
                        <input
                          type="time"
                          value={h.closeTime}
                          onChange={(e) => updateHour(i, "closeTime", e.target.value)}
                          className="h-10 rounded-xl border border-neutral-300 bg-white px-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-neutral-500">Cerrado</p>
                    )}
                  </div>
                ))}
              </div>

              {hoursError ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-500">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {hoursError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={saveHours}
                disabled={hoursSaving}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-60 sm:w-auto"
              >
                {hoursSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {hoursSaving ? "Guardando..." : "Guardar horarios"}
              </button>
              </Island>
            ) : null}

            <Island
              id="seguridad"
              title="Cambiar contrasena"
              subtitle="Actualiza tu clave de acceso"
              icon={<Lock className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />}
            >
            {passwordDone ? (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Contrasena actualizada correctamente.
              </div>
            ) : null}

            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Contrasena actual</Label>
                <div className="relative">
                  <Input id="currentPassword" type={showCurrent ? "text" : "password"} placeholder="********" className="pr-10" {...register("currentPassword")} />
                  <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordErrors.currentPassword ? <p className="mt-1 text-xs text-red-500">{passwordErrors.currentPassword.message}</p> : null}
              </div>

              <div>
                <Label htmlFor="newPassword">Nueva contrasena</Label>
                <div className="relative">
                  <Input id="newPassword" type={showNew ? "text" : "password"} placeholder="********" className="pr-10" {...register("newPassword")} />
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordErrors.newPassword ? <p className="mt-1 text-xs text-red-500">{passwordErrors.newPassword.message}</p> : null}
              </div>

              <div>
                <Label htmlFor="newPasswordConfirm">Confirmar nueva contrasena</Label>
                <div className="relative">
                  <Input id="newPasswordConfirm" type={showConfirm ? "text" : "password"} placeholder="********" className="pr-10" {...register("newPasswordConfirm")} />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordErrors.newPasswordConfirm ? <p className="mt-1 text-xs text-red-500">{passwordErrors.newPasswordConfirm.message}</p> : null}
              </div>

              {passwordError ? (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-500">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {passwordError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleSubmit(onPasswordSubmit)}
                disabled={isPasswordSubmitting}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-60 sm:w-auto"
              >
                {isPasswordSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isPasswordSubmitting ? "Guardando..." : "Actualizar contrasena"}
              </button>
            </div>
            </Island>
          </div>
        </div>

        <footer className="pb-4 text-center text-xs text-neutral-500">{business ? `Negocio activo: ${business.name}` : ""}</footer>
      </div>
    </div>
  );
}
