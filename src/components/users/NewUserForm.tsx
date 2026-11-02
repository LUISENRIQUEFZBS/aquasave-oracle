"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, type StaffRole } from "@/lib/actions/users";
import { useAction } from "@/components/ui/useAction";
import { btnPrimary, input } from "@/components/ui/styles";

export default function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("EVALUATOR");
  const [password, setPassword] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createUser({ name, email, role, password }), () => { router.refresh(); onCreated(); });
      }}
    >
      <label className="block space-y-1.5"><span className="text-sm font-medium">Nombre completo</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium">Correo</span>
        <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <span className="block text-xs text-text-muted">Si iniciará sesión con Google o Microsoft, debe coincidir exactamente con esa cuenta (sin tildes).</span></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium">Rol</span>
        <select className={input} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          <option value="EVALUATOR">Evaluador</option>
          <option value="RECEPTIONIST">Recepcionista</option>
          <option value="ADMIN">Administrador</option>
        </select></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium">Contraseña <span className="font-normal text-text-muted">(opcional)</span></span>
        <input className={input} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mín. 8 caracteres" />
        <span className="block text-xs text-text-muted">Déjala vacía si la persona solo entrará con Google o Microsoft. Podrás asignarle una después.</span></label>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button className={btnPrimary + " w-full"} disabled={pending}>{pending ? "Creando..." : "Crear usuario"}</button>
    </form>
  );
}
