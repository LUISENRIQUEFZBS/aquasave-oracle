"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUser, resetUserPassword, setUserStatus, type StaffListItem, type StaffRole } from "@/lib/actions/users";
import { useAction } from "@/components/ui/useAction";
import { confirmToast } from "@/lib/confirm-toast";
import { btn, btnPrimary, input } from "@/components/ui/styles";

export default function EditUserForm({ user, isSelf }: { user: StaffListItem; isSelf: boolean }) {
  const router = useRouter();
  const save = useAction();
  const reset = useAction();
  const toggle = useAction();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<StaffRole>(user.role);
  const [saved, setSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [pw, setPw] = useState("");
  const [resetDone, setResetDone] = useState(false);

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          save.run(() => updateUser({ id: user.id, name, email, role }), () => { router.refresh(); setSaved(true); setTimeout(() => setSaved(false), 2000); });
        }}
      >
        <label className="block space-y-1.5"><span className="text-sm font-medium">Nombre completo</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium">Correo</span>
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <span className="block text-xs text-text-muted">Debe coincidir exactamente con su cuenta de Google/Microsoft, si usa esos métodos.</span></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium">Rol</span>
          <select className={input} value={role} onChange={(e) => setRole(e.target.value as StaffRole)} disabled={isSelf}>
            <option value="ADMIN">Administrador</option>
            <option value="RECEPTIONIST">Recepcionista</option>
            <option value="EVALUATOR">Evaluador</option>
          </select>
          {isSelf && <span className="block text-xs text-text-muted">No puedes cambiar tu propio rol.</span>}</label>
        {save.error && <p className="text-sm text-danger" role="alert">{save.error}</p>}
        <div className="flex items-center gap-3">
          <button className={btnPrimary} disabled={save.pending}>{save.pending ? "Guardando..." : "Guardar cambios"}</button>
          {saved && <span className="text-sm text-success">Guardado</span>}
        </div>
      </form>

      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-xs text-text-muted">{user.hasPassword ? "Tiene contraseña configurada." : "No tiene contraseña: solo entra con Google/Microsoft."}</p>
        <button type="button" onClick={() => setShowReset(!showReset)} className="min-h-11 text-sm font-medium text-primary hover:underline sm:min-h-0">
          {showReset ? "Cancelar" : user.hasPassword ? "Cambiar contraseña" : "Asignar contraseña"}
        </button>
        {showReset && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <input className={input} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nueva contraseña (mín. 8 caracteres)" />
            {reset.error && <p className="text-xs text-danger">{reset.error}</p>}
            {resetDone && <p className="text-xs text-success">Contraseña actualizada.</p>}
            <button type="button" className={btnPrimary} disabled={reset.pending} onClick={() => { setResetDone(false); reset.run(() => resetUserPassword({ id: user.id, newPassword: pw }), () => { setPw(""); setResetDone(true); router.refresh(); }); }}>
              {reset.pending ? "Guardando..." : "Guardar contraseña"}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <button
          type="button"
          disabled={toggle.pending || isSelf}
          title={isSelf ? "No puedes desactivar tu propia cuenta" : undefined}
          className={btn + (user.active ? " text-danger" : " text-primary")}
          onClick={async () => {
            if (user.active && !(await confirmToast(`¿Desactivar a ${user.name}? No podrá iniciar sesión, pero su historial se conserva.`))) return;
            toggle.run(() => setUserStatus(user.id, user.active ? 2 : 1), () => router.refresh());
          }}
        >
          {toggle.pending ? "Actualizando..." : user.active ? "Desactivar usuario" : "Reactivar usuario"}
        </button>
        {toggle.error && <p className="mt-1 text-sm text-danger">{toggle.error}</p>}
      </div>
    </div>
  );
}
