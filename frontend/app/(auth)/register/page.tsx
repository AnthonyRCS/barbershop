"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Scissors,
  User,
  Lock,
  Phone,
  MapPin,
  Mail,
} from "lucide-react";
import { Input, Label } from "@/components/ui";

// ─── Data ─────────────────────────────────────────────────────────────────────

const COUNTRY_OPTIONS = [
  { code: "US", name: "Estados Unidos", dialCode: "+1", currency: "USD", locale: "en-US", timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"] },
  { code: "MX", name: "México", dialCode: "+52", currency: "MXN", locale: "es-MX", timezones: ["America/Mexico_City"] },
  { code: "CO", name: "Colombia", dialCode: "+57", currency: "COP", locale: "es-CO", timezones: ["America/Bogota"] },
  { code: "PE", name: "Perú", dialCode: "+51", currency: "PEN", locale: "es-PE", timezones: ["America/Lima"] },
  { code: "CL", name: "Chile", dialCode: "+56", currency: "CLP", locale: "es-CL", timezones: ["America/Santiago"] },
  { code: "AR", name: "Argentina", dialCode: "+54", currency: "ARS", locale: "es-AR", timezones: ["America/Argentina/Buenos_Aires"] },
  { code: "ES", name: "España", dialCode: "+34", currency: "EUR", locale: "es-ES", timezones: ["Europe/Madrid"] },
  { code: "GB", name: "Reino Unido", dialCode: "+44", currency: "GBP", locale: "en-GB", timezones: ["Europe/London"] },
  { code: "BR", name: "Brasil", dialCode: "+55", currency: "BRL", locale: "pt-BR", timezones: ["America/Sao_Paulo"] },
  { code: "CA", name: "Canadá", dialCode: "+1", currency: "CAD", locale: "en-CA", timezones: ["America/Toronto", "America/Vancouver"] },
  { code: "VE", name: "Venezuela", dialCode: "+58", currency: "VES", locale: "es-VE", timezones: ["America/Caracas"] },
  { code: "EC", name: "Ecuador", dialCode: "+593", currency: "USD", locale: "es-EC", timezones: ["America/Guayaquil"] },
  { code: "BO", name: "Bolivia", dialCode: "+591", currency: "BOB", locale: "es-BO", timezones: ["America/La_Paz"] },
  { code: "PY", name: "Paraguay", dialCode: "+595", currency: "PYG", locale: "es-PY", timezones: ["America/Asuncion"] },
  { code: "UY", name: "Uruguay", dialCode: "+598", currency: "UYU", locale: "es-UY", timezones: ["America/Montevideo"] },
  { code: "DO", name: "Rep. Dominicana", dialCode: "+1", currency: "DOP", locale: "es-DO", timezones: ["America/Santo_Domingo"] },
  { code: "GT", name: "Guatemala", dialCode: "+502", currency: "GTQ", locale: "es-GT", timezones: ["America/Guatemala"] },
  { code: "HN", name: "Honduras", dialCode: "+504", currency: "HNL", locale: "es-HN", timezones: ["America/Tegucigalpa"] },
  { code: "SV", name: "El Salvador", dialCode: "+503", currency: "USD", locale: "es-SV", timezones: ["America/El_Salvador"] },
  { code: "NI", name: "Nicaragua", dialCode: "+505", currency: "NIO", locale: "es-NI", timezones: ["America/Managua"] },
  { code: "CR", name: "Costa Rica", dialCode: "+506", currency: "CRC", locale: "es-CR", timezones: ["America/Costa_Rica"] },
  { code: "PA", name: "Panamá", dialCode: "+507", currency: "USD", locale: "es-PA", timezones: ["America/Panama"] },
  { code: "CU", name: "Cuba", dialCode: "+53", currency: "CUP", locale: "es-CU", timezones: ["America/Havana"] },
  { code: "PR", name: "Puerto Rico", dialCode: "+1", currency: "USD", locale: "es-PR", timezones: ["America/Puerto_Rico"] },
  { code: "DE", name: "Alemania", dialCode: "+49", currency: "EUR", locale: "de-DE", timezones: ["Europe/Berlin"] },
  { code: "FR", name: "Francia", dialCode: "+33", currency: "EUR", locale: "fr-FR", timezones: ["Europe/Paris"] },
  { code: "IT", name: "Italia", dialCode: "+39", currency: "EUR", locale: "it-IT", timezones: ["Europe/Rome"] },
  { code: "PT", name: "Portugal", dialCode: "+351", currency: "EUR", locale: "pt-PT", timezones: ["Europe/Lisbon"] },
];

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "MXN", "COP", "PEN", "CLP", "ARS", "BRL", "VES", "BOB", "PYG", "UYU", "DOP", "GTQ", "NIO", "CRC", "CUP", "HNL"];
const LOCALE_OPTIONS = ["es-ES", "es-MX", "es-CO", "es-PE", "es-AR", "es-CL", "es-VE", "es-DO", "es-GT", "en-US", "en-GB", "en-CA", "pt-BR", "pt-PT", "fr-FR", "de-DE", "it-IT"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

function normalizePhone(dialCode: string, phone: string): string {
  const onlyDigits = phone.replace(/\D/g, "");
  const dialDigits = dialCode.replace(/\D/g, "");
  return `+${dialDigits}${onlyDigits}`;
}


// ─── Password strength ────────────────────────────────────────────────────────

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const capped = Math.min(score, 4);
  const map = [
    { label: "Muy débil", color: "bg-red-500" },
    { label: "Débil", color: "bg-orange-500" },
    { label: "Regular", color: "bg-yellow-400" },
    { label: "Buena", color: "bg-blue-500" },
    { label: "Excelente", color: "bg-emerald-500" },
  ];
  return { score: capped, ...map[capped] };
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Negocio", short: "Tu barbería", icon: Building2 },
  { id: 2, title: "Región", short: "Localización", icon: Globe },
  { id: 3, title: "Cuenta", short: "Acceso", icon: User },
] as const;

type Step = (typeof STEPS)[number]["id"];

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  businessName: string;
  businessSlug: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  countryCode: string;
  dialCode: string;
  currency: string;
  locale: string;
  timezone: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  acceptTerms: boolean;
  acceptMarketing: boolean;
}

// ─── Step label component ─────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < current;
        const isActive = step.id === current;
        const StepIcon = step.icon;

        return (
          <div key={step.id} className="flex items-center gap-0">
            {/* Step */}
            <div className="flex flex-col items-center">
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted
                    ? "border-indigo-500 bg-indigo-500 text-white"
                    : isActive
                    ? "border-indigo-500 bg-indigo-500/10 text-primary"
                    : "border-zinc-700 bg-zinc-800/50 text-zinc-600",
                ].join(" ")}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
              </div>
              <span
                className={[
                  "mt-1.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : isCompleted ? "text-zinc-400" : "text-zinc-600",
                ].join(" ")}
              >
                {step.title}
              </span>
            </div>

            {/* Connector */}
            {idx < STEPS.length - 1 && (
              <div className="mx-2 mb-5 h-[2px] w-16 flex-1 overflow-hidden rounded-full bg-zinc-800 sm:w-20">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: step.id < current ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const animRef = useRef<string>("animate-fade-in");

  const [form, setForm] = useState<FormState>({
    businessName: "",
    businessSlug: "",
    businessEmail: "",
    businessPhone: "",
    businessAddress: "",
    countryCode: "US",
    dialCode: "+1",
    currency: "USD",
    locale: "en-US",
    timezone: "America/New_York",
    ownerName: "",
    ownerEmail: "",
    password: "",
    acceptTerms: false,
    acceptMarketing: false,
  });


  // Auto-detect country/timezone from browser
  useEffect(() => {
    const browserLocale = Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
    const regionCode = browserLocale.split("-")[1]?.toUpperCase();
    const found = COUNTRY_OPTIONS.find((c) => c.code === regionCode);
    if (found) {
      setForm((prev) => ({
        ...prev,
        countryCode: found.code,
        dialCode: found.dialCode,
        currency: found.currency,
        locale: found.locale,
        timezone: found.timezones[0] ?? browserTimezone,
      }));
    } else {
      setForm((prev) => ({ ...prev, timezone: browserTimezone }));
    }
  }, []);


  // ── Field helpers ─────────────────────────────────────────────────────────

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleBusinessName(value: string) {
    setField("businessName", value);
    if (!slugTouched) setField("businessSlug", toSlug(value));
  }

  function handleSlug(value: string) {
    setSlugTouched(true);
    setField("businessSlug", toSlug(value));
  }

  function handleCountry(code: string) {
    const country = COUNTRY_OPTIONS.find((c) => c.code === code);
    if (!country) return;
    setForm((prev) => ({
      ...prev,
      countryCode: country.code,
      dialCode: country.dialCode,
      currency: country.currency,
      locale: country.locale,
      timezone: country.timezones[0] ?? prev.timezone,
    }));
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedCountry = useMemo(
    () => COUNTRY_OPTIONS.find((c) => c.code === form.countryCode) ?? COUNTRY_OPTIONS[0],
    [form.countryCode],
  );

  const timezoneOptions = useMemo(() => {
    const base = [...selectedCountry.timezones];
    if (form.timezone && !base.includes(form.timezone)) base.unshift(form.timezone);
    return Array.from(new Set(base));
  }, [selectedCountry.timezones, form.timezone]);

  const passwordStrength = getPasswordStrength(form.password);

  // ── Validation ────────────────────────────────────────────────────────────

  function validateStep(s: Step): Record<string, string> {
    const errs: Record<string, string> = {};

    if (s === 1) {
      if (!form.businessName.trim()) errs.businessName = "Nombre del negocio requerido";
      if (!form.businessSlug || form.businessSlug.length < 2) errs.businessSlug = "Slug mínimo 2 caracteres";
      if (!form.businessEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.businessEmail))
        errs.businessEmail = "Email del negocio inválido";
      if (!form.businessPhone.trim()) errs.businessPhone = "Teléfono requerido";
      if (!form.businessAddress.trim() || form.businessAddress.length < 5)
        errs.businessAddress = "Dirección mínimo 5 caracteres";
    }

    if (s === 2) {
      if (!form.countryCode) errs.countryCode = "Selecciona un país";
      if (!form.timezone) errs.timezone = "Selecciona zona horaria";
    }

    if (s === 3) {
      if (!form.ownerName.trim() || form.ownerName.length < 2) errs.ownerName = "Nombre mínimo 2 caracteres";
      if (!form.ownerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail))
        errs.ownerEmail = "Email inválido";
      if (!form.password || form.password.length < 8) errs.password = "Contraseña mínimo 8 caracteres";
      if (!form.acceptTerms) errs.acceptTerms = "Debes aceptar los términos";
    }

    return errs;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function goNext() {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setStepErrors(errs);
      return;
    }
    setStepErrors({});
    setDirection("forward");
    setStep((s) => Math.min(s + 1, 3) as Step);
  }

  function goBack() {
    setStepErrors({});
    setDirection("backward");
    setStep((s) => Math.max(s - 1, 1) as Step);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit() {
    const errs = validateStep(3);
    if (Object.keys(errs).length > 0) {
      setStepErrors(errs);
      return;
    }

    setStatus("loading");
    setMessage("");

    const phoneNormalized = normalizePhone(form.dialCode, form.businessPhone);
    if (phoneNormalized.length < 8) {
      setStatus("error");
      setMessage("Teléfono inválido. Usa formato internacional.");
      return;
    }

    const payload = {
      businessName: form.businessName.trim(),
      businessSlug: form.businessSlug.trim(),
      businessEmail: form.businessEmail.trim().toLowerCase(),
      businessPhone: phoneNormalized,
      businessAddress: form.businessAddress.trim(),
      countryCode: form.countryCode,
      dialCode: form.dialCode,
      currency: form.currency,
      locale: form.locale,
      timezone: form.timezone,
      name: form.ownerName.trim(),
      email: form.ownerEmail.trim().toLowerCase(),
      password: form.password,
      role: "OWNER",
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"}/api/v1/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      let body: Record<string, unknown> | null = null;
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        body = null;
      }

      if (res.ok) {
        setStatus("success");
          setMessage("¡Cuenta creada con éxito! Redirigiendo al login...");
          setTimeout(() => {
            router.push(
              `/login?email=${encodeURIComponent(payload.email)}&businessSlug=${encodeURIComponent(payload.businessSlug)}`,
            );
          }, 1800);
      } else {
        setStatus("error");
        const errMsg =
          typeof body?.message === "string" && body.message.length > 0
            ? body.message
            : "No se pudo crear la cuenta. Verifica los datos e inténtalo de nuevo.";
        setMessage(errMsg);
      }
    } catch {
      setStatus("error");
      setMessage("No se pudo conectar con el servidor. Verifica tu conexión.");
    }
  }

  // ── Select class ──────────────────────────────────────────────────────────

  const selectCls =
    "h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

  // ── Field error ───────────────────────────────────────────────────────────

  function FieldError({ field }: { field: string }) {
    return stepErrors[field] ? (
      <p className="mt-1 text-xs text-red-400">{stepErrors[field]}</p>
    ) : null;
  }

  // ── Render steps ──────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Business name + slug */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="businessName">
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-zinc-500" />Nombre del negocio</span>
            </Label>
            <Input
              id="businessName"
              placeholder="Northside Barbers"
              required
              value={form.businessName}
              onChange={(e) => handleBusinessName(e.target.value)}
              className={stepErrors.businessName ? "border-red-500/50" : ""}
            />
            <FieldError field="businessName" />
          </div>
          <div>
            <Label htmlFor="businessSlug">
              <span className="flex items-center gap-1.5">URL slug</span>
            </Label>
            <Input
              id="businessSlug"
              placeholder="northside-barbers"
              autoComplete="off"
              value={form.businessSlug}
              onChange={(e) => handleSlug(e.target.value)}
              className={stepErrors.businessSlug ? "border-red-500/50" : ""}
            />
            <p className="mt-1 text-[10px] text-zinc-600">
              Tu URL: <span className="text-zinc-400">/{form.businessSlug || "tu-negocio"}</span>
            </p>
            <FieldError field="businessSlug" />
          </div>
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="businessEmail">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-zinc-500" />Email del negocio</span>
            </Label>
            <Input
              id="businessEmail"
              type="email"
              placeholder="info@northside.com"
              value={form.businessEmail}
              onChange={(e) => setField("businessEmail", e.target.value)}
              className={stepErrors.businessEmail ? "border-red-500/50" : ""}
            />
            <FieldError field="businessEmail" />
          </div>
          <div>
            <Label htmlFor="businessPhone">
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-zinc-500" />Teléfono</span>
            </Label>
            <div className="flex items-center gap-1.5">
              <span className="flex h-10 min-w-[56px] items-center justify-center rounded-md border border-zinc-700 bg-zinc-800/60 px-2 text-sm text-zinc-400 select-none">
                {form.dialCode}
              </span>
              <Input
                id="businessPhone"
                placeholder="999 999 999"
                inputMode="tel"
                value={form.businessPhone}
                onChange={(e) => setField("businessPhone", e.target.value)}
                className={stepErrors.businessPhone ? "border-red-500/50" : ""}
              />
            </div>
            <FieldError field="businessPhone" />
          </div>
        </div>

        {/* Address */}
        <div>
          <Label htmlFor="businessAddress">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-zinc-500" />Dirección</span>
          </Label>
          <Input
            id="businessAddress"
            placeholder="Calle Principal 123, Ciudad"
            value={form.businessAddress}
            onChange={(e) => setField("businessAddress", e.target.value)}
            className={stepErrors.businessAddress ? "border-red-500/50" : ""}
          />
          <FieldError field="businessAddress" />
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Country */}
          <div>
            <Label htmlFor="countryCode">País</Label>
            <select
              id="countryCode"
              value={form.countryCode}
              onChange={(e) => handleCountry(e.target.value)}
              className={selectCls}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <FieldError field="countryCode" />
          </div>

          {/* Currency */}
          <div>
            <Label htmlFor="currency">Moneda</Label>
            <select id="currency" value={form.currency} onChange={(e) => setField("currency", e.target.value)} className={selectCls}>
              {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Locale */}
          <div>
            <Label htmlFor="locale">Idioma y formato</Label>
            <select id="locale" value={form.locale} onChange={(e) => setField("locale", e.target.value)} className={selectCls}>
              {LOCALE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Timezone */}
          <div>
            <Label htmlFor="timezone">Zona horaria</Label>
            <select id="timezone" value={form.timezone} onChange={(e) => setField("timezone", e.target.value)} className={selectCls}>
              {timezoneOptions.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
            <FieldError field="timezone" />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Resumen regional</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-zinc-500">País:</span>
            <span className="text-zinc-300">{selectedCountry.name}</span>
            <span className="text-zinc-500">Moneda:</span>
            <span className="text-zinc-300">{form.currency}</span>
            <span className="text-zinc-500">Zona horaria:</span>
            <span className="text-zinc-300 truncate">{form.timezone}</span>
            <span className="text-zinc-500">Teléfono:</span>
            <span className="text-zinc-300">{form.dialCode} (código de país)</span>
          </div>
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Owner name + email */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ownerName">
              <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-zinc-500" />Tu nombre</span>
            </Label>
            <Input
              id="ownerName"
              placeholder="Alex García"
              value={form.ownerName}
              onChange={(e) => setField("ownerName", e.target.value)}
              className={stepErrors.ownerName ? "border-red-500/50" : ""}
            />
            <FieldError field="ownerName" />
          </div>
          <div>
            <Label htmlFor="ownerEmail">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-zinc-500" />Tu email</span>
            </Label>
            <Input
              id="ownerEmail"
              type="email"
              placeholder="alex@negocio.com"
              value={form.ownerEmail}
              onChange={(e) => setField("ownerEmail", e.target.value)}
              className={[
                stepErrors.ownerEmail ? "border-red-500/50" : "",
              ].join(" ")}
            />
            <FieldError field="ownerEmail" />
          </div>
        </div>

        {/* Password */}
          <div>
            <Label htmlFor="password">
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-zinc-500" />Contraseña</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mín. 8 caracteres"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                className={["pr-10", stepErrors.password ? "border-red-500/50" : ""].join(" ")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                aria-label={showPassword ? "Ocultar" : "Mostrar"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Strength meter */}
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={[
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        i <= passwordStrength.score ? passwordStrength.color : "bg-zinc-800",
                      ].join(" ")}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-zinc-500">{passwordStrength.label}</p>
              </div>
            )}
            <FieldError field="password" />
          </div>

        {/* Terms */}
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => setField("acceptTerms", e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded accent-indigo-500"
            />
            <span className="text-xs text-zinc-300">
              Acepto los{" "}
              <a href="#" className="text-primary underline underline-offset-2 hover:text-primary/80">
                términos de servicio
              </a>{" "}
              y la{" "}
              <a href="#" className="text-primary underline underline-offset-2 hover:text-primary/80">
                política de privacidad
              </a>
            </span>
          </label>
          {stepErrors.acceptTerms && (
            <p className="text-xs text-red-400 pl-6">{stepErrors.acceptTerms}</p>
          )}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.acceptMarketing}
              onChange={(e) => setField("acceptMarketing", e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded accent-indigo-500"
            />
            <span className="text-xs text-zinc-500">
              Quiero recibir novedades del producto (opcional)
            </span>
          </label>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4 py-8">
      {/* Grid */}
      <div className="bg-grid-indigo-soft pointer-events-none absolute inset-0 opacity-25" />
      {/* Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        {/* Logo */}
        <div className="mb-7 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-900/60 ring-1 ring-indigo-400/20">
            <Scissors className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Barbershop Pro</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Registra tu barbería y empieza gratis</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-2xl shadow-black/50 backdrop-blur-sm">



          {/* Progress */}
          <div className="border-b border-zinc-800 px-6 pt-5 pb-4">
            <StepIndicator current={step} />
            <div>
              <p className="text-xs font-semibold text-zinc-400">
                Paso {step} de {STEPS.length}
              </p>
              <h2 className="mt-0.5 text-base font-bold text-zinc-100">
                {step === 1 && "Datos de tu barbería"}
                {step === 2 && "Configuración regional"}
                {step === 3 && "Tu cuenta de acceso"}
              </h2>
            </div>
          </div>

          {/* Step content */}
          <div className="p-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {/* Feedback messages */}
            {status === "error" && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 animate-fade-in">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                <p className="text-xs text-red-400">{message}</p>
              </div>
            )}
            {status === "success" && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 animate-fade-in">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                <p className="text-xs text-emerald-400">{message}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center gap-3">
              {step > 1 && status !== "success" && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={status === "loading"}
                  className="flex h-10 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:text-zinc-100 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Atrás
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="ml-auto flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.97] active:bg-primary/80"
                >
                  Continuar
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={status === "loading" || status === "success"}
                  className="ml-auto flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.97] active:bg-primary/80 disabled:pointer-events-none disabled:opacity-60"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : status === "success" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Cuenta creada
                    </>
                  ) : (
                    <>
                      Crear cuenta
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-600">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="font-medium text-primary transition-colors hover:text-primary/80">
            Inicia sesión aquí
          </a>
        </p>
        <p className="mt-2 text-center text-xs text-zinc-700">
          © {new Date().getFullYear()} Barbershop Pro · Todos los derechos reservados
        </p>
      </div>
    </main>
  );
}


