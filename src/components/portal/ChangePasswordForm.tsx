"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeOwnPassword } from "@/lib/actions/clientSecurity";
import { useAction } from "@/components/ui/useAction";
import { btnPrimary, input } from "@/components/ui/styles";

export default function ChangePasswordForm({ forced, hasPassword }: { forced: boolean; hasPassword: boolean }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  if (!hasPassword) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5">
        <h1 className="text-lg font-semibold text-text">Seguridad</h1>
        <p className="mt-2 text-sm text-text-muted">Tu cuenta ingresa con Google y no tiene contraseña. Si necesitas una, pídela a un administrador de SEDAPAL.</p>
      </div>
    );
  }
  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setLocalError(null);
        if (next !== confirm) { setLocalError("La confirmación no coincide con la nueva contraseña."); return; }
        run(() => changeOwnPassword({ currentPassword: current, newPassword: next }), () => { router.replace("/portal"); router.refresh(); });
      }}
    >
      <div>
        <h1 className="text-lg font-semibold text-text">{forced ? "Crea tu contraseña" : "Cambiar contraseña"}</h1>
        {forced && <p className="mt-1 text-sm text-text-muted">Estás usando una contraseña temporal. Debes cambiarla para continuar.</p>}
      </div>
      <label className="block space-y-1.5"><span className="text-sm font-medium">{forced ? "Contraseña temporal" : "Contraseña actual"}</span>
        <input className={input} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium">Nueva contraseña</span>
        <input className={input} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Mín. 8 caracteres" required /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium">Repite la nueva contraseña</span>
        <input className={input} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
      {(localError || error) && <p className="text-sm text-danger" role="alert">{localError ?? error}</p>}
      <button className={btnPrimary + " w-full"} disabled={pending}>{pending ? "Guardando..." : "Guardar contraseña"}</button>
    </form>
  );
}
