"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
type Audience = "client" | "internal";
const TAB_STORAGE_KEY = "aquasave-login-tab";
// Auth.js error codes we actually produce, mapped to Spanish copy.
// AccessDenied covers three real cases from the signIn() callbacks in
// auth.ts (no matching account, inactive account, internal-Google with
// no matching User) — Auth.js doesn't distinguish them in the query
// param, so one message has to cover all three.
const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "No encontramos una cuenta activa con ese correo. Si eres cliente, pide a SEDAPAL que un administrador cree tu acceso. Si eres personal interno, contacta a un administrador del sistema.",
  Default: "No se pudo iniciar sesión. Intenta de nuevo.",
};
export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg lg:flex-row">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <Suspense fallback={<LoginCardSkeleton />}>
          <LoginCard />
        </Suspense>
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------
// Left brand panel — collapses to a slim strip on mobile so the form stays
// front and center on small screens; full gauge signature on desktop.
// ---------------------------------------------------------------------------
function BrandPanel() {
  return (
    <div className="aqs-brand-panel relative flex shrink-0 flex-col justify-between overflow-hidden px-6 py-6 text-white lg:w-[46%] lg:px-14 lg:py-14 xl:w-[42%]">
      <FontImports />
      <div className="aqs-grid pointer-events-none absolute inset-0 opacity-[0.07]" />
      <div className="relative flex items-center gap-3 lg:block">
        <Logo variant="dark" markSize={36} wordmarkSize="text-xl" />
      </div>
      {/* Signature element — desktop only. The three bars literally
          re-state the logo's own concept (con/sin-ahorrador comparison),
          not a generic stat block. */}
      <div className="relative mt-10 hidden flex-1 flex-col justify-center lg:flex">
        <p className="aqs-eyebrow text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
          Laboratorio de certificación
        </p>
        <h1 className="aqs-display mt-3 text-4xl leading-[1.08] font-semibold text-white xl:text-[2.75rem]">
          Cada gota,
          <br />
          medida con precisión.
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
          Plataforma interna de evaluación y certificación de productos
          ahorradores de agua.
        </p>
        <FlowGauge />
      </div>
      <p className="relative hidden text-xs text-white/35 lg:block">
        SEDAPAL · Certificación de productos ahorradores
      </p>
    </div>
  );
}
function FlowGauge() {
  // Three trials, decreasing consumption — mirrors the logo's descending
  // bar chart and the app's own con/sin-ahorrador methodology.
  const bars = [
    { label: "Sin ahorrador", value: 18, heightPct: 100 },
    { label: "Con ahorrador", value: 9, heightPct: 55 },
    { label: "Ahorro", value: 50, heightPct: 78, isPercent: true },
  ];
  return (
    <div
      className="mt-10 flex items-end gap-6"
      role="img"
      aria-label="Ilustración: comparación de consumo de agua con y sin dispositivo ahorrador"
    >
      {bars.map((bar, i) => (
        <div key={bar.label} className="flex flex-col items-center gap-3">
          <div className="relative flex h-32 w-9 items-end overflow-hidden rounded-full bg-white/10">
            <div
              className="aqs-gauge-fill w-full rounded-full"
              style={{
                // @ts-expect-error -- custom property consumed by the keyframe
                "--fill-height": `${bar.heightPct}%`,
                animationDelay: `${300 + i * 180}ms`,
              }}
            />
          </div>
          <div className="text-center">
            <p className="aqs-mono text-sm font-semibold text-white">
              {bar.value}
              {bar.isPercent ? "%" : " L/min"}
            </p>
            <p className="aqs-mono mt-0.5 text-[10px] uppercase tracking-wide text-white/45">
              {bar.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
function LoginCardSkeleton() {
  return <div className="h-[420px] w-full max-w-[26rem]" aria-hidden />;
}
// ---------------------------------------------------------------------------
// Right panel — single card, segmented Clientes/Personal toggle so only one
// form is ever active. Errors render inline inside that active form.
// ---------------------------------------------------------------------------
function LoginCard() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const [audience, setAudience] = useState<Audience>("client");
  useEffect(() => {
    const stored = window.sessionStorage.getItem(TAB_STORAGE_KEY);
    if (stored === "client" || stored === "internal") {
      setAudience(stored);
    }
  }, []);
  const selectAudience = (next: Audience) => {
    setAudience(next);
    window.sessionStorage.setItem(TAB_STORAGE_KEY, next);
  };
  return (
    <div className="w-full max-w-[26rem]">
      <div className="mb-6 flex flex-col items-center gap-3 text-center lg:hidden">
        <Logo markSize={40} wordmarkSize="text-xl" />
        <p className="text-sm text-text-muted">Plataforma de gestión</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-2 shadow-sm">
        <AudienceToggle audience={audience} onChange={selectAudience} />
        <div className="p-5 pt-4">
          {audience === "client" ? (
            <ClientLoginForm errorCode={errorCode} onGoogleStart={() => selectAudience("client")} />
          ) : (
            <InternalLoginForm errorCode={errorCode} onGoogleStart={() => selectAudience("internal")} />
          )}
        </div>
      </div>
    </div>
  );
}
function AudienceToggle({
  audience,
  onChange,
}: {
  audience: Audience;
  onChange: (a: Audience) => void;
}) {
  return (
    <div className="relative grid grid-cols-2 rounded-xl bg-bg p-1">
      <span
        className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-lg bg-surface shadow-sm transition-transform duration-200 ease-out"
        style={{
          transform: audience === "internal" ? "translateX(calc(100% + 0.5rem))" : "translateX(0)",
        }}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => onChange("client")}
        className={`relative z-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          audience === "client" ? "text-text" : "text-text-muted hover:text-text"
        }`}
        aria-pressed={audience === "client"}
      >
        Clientes
      </button>
      <button
        type="button"
        onClick={() => onChange("internal")}
        className={`relative z-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          audience === "internal" ? "text-text" : "text-text-muted hover:text-text"
        }`}
        aria-pressed={audience === "internal"}
      >
        Personal SEDAPAL
      </button>
    </div>
  );
}
function InlineError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="aqs-error-in flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger/[0.06] px-3.5 py-3 text-sm text-danger"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="mt-0.5 shrink-0"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8v5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="leading-snug">{message}</span>
    </div>
  );
}
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.89c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.89-3.02c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.27a12 12 0 0 0 0 10.8l4.02-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.6l4.02 3.11C6.23 6.87 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}
function ClientLoginForm({
  errorCode,
  onGoogleStart,
}: {
  errorCode: string | null;
  onGoogleStart: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const handleGoogle = () => {
    onGoogleStart();
    signIn("google-client", { callbackUrl: "/portal" });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("client-credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/portal");
    router.refresh();
  };
  const authError = errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default : null;
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-bg"
      >
        <GoogleIcon />
        Continuar con Google
      </button>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted">o</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="nombre@empresa.com"
        />
        <PasswordField
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggleShow={() => setShowPassword((s) => !s)}
        />
        {error && <InlineError message={error} />}
        {!error && authError && <InlineError message={authError} />}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
function InternalLoginForm({
  errorCode,
  onGoogleStart,
}: {
  errorCode: string | null;
  onGoogleStart: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const handleGoogle = () => {
    onGoogleStart();
    signIn("google-internal", { callbackUrl: "/" });
  };
  const handleMicrosoft = () => {
    onGoogleStart();
    signIn("microsoft-entra-id", { callbackUrl: "/" });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/");
    router.refresh();
  };
  const authError = errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default : null;
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleMicrosoft}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-bg"
      >
        <MicrosoftIcon />
        Iniciar sesión con Microsoft
      </button>
      <button
        type="button"
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-bg"
      >
        <GoogleIcon />
        Ingresar con Google
      </button>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted">o</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="nombre@aquasave.com.pe"
        />
        <PasswordField
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggleShow={() => setShowPassword((s) => !s)}
        />
        {error && <InlineError message={error} />}
        {!error && authError && <InlineError message={authError} />}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-muted">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border px-3 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
      />
    </div>
  );
}
function PasswordField({
  value,
  onChange,
  show,
  onToggleShow,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-muted">Contraseña</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2.5 pr-10 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted hover:text-text"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MicrosoftIcon() {
  // Official 4-square Microsoft logo — same treatment as GoogleIcon
  // above (fixed brand colors, not themeable).
  return (
    <svg width="18" height="18" viewBox="0 0 23 23">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
// ---------------------------------------------------------------------------
// Fonts + one-off styles. Loaded here (not in the root layout) to keep this
// a self-contained page change — worth moving to next/font in
// app/layout.tsx later for perf if you like the result, see chat note.
// ---------------------------------------------------------------------------
function FontImports() {
  return (
    <style jsx global>{`
      @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap");
      .aqs-brand-panel {
        background: radial-gradient(120% 140% at 15% 0%, #14707d 0%, #0f5c68 42%, #093c45 100%);
      }
      .aqs-grid {
        background-image:
          linear-gradient(to right, white 1px, transparent 1px),
          linear-gradient(to bottom, white 1px, transparent 1px);
        background-size: 34px 34px;
      }
      .aqs-display {
        font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
        letter-spacing: -0.01em;
      }
      .aqs-eyebrow,
      .aqs-mono {
        font-family: "IBM Plex Mono", ui-monospace, monospace;
      }
      .aqs-gauge-fill {
        height: var(--fill-height);
        background: linear-gradient(180deg, #6fe0ea 0%, #3fc1d0 55%, #0f5c68 100%);
        transform-origin: bottom;
        animation: aqs-fill 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @keyframes aqs-fill {
        from {
          transform: scaleY(0);
        }
        to {
          transform: scaleY(1);
        }
      }
      .aqs-error-in {
        animation: aqs-slide-in 200ms ease-out both;
      }
      @keyframes aqs-slide-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .aqs-gauge-fill,
        .aqs-error-in {
          animation: none !important;
          transform: none !important;
          opacity: 1 !important;
        }
      }
    `}</style>
  );
}