"use client";
import { useState } from "react";
import Drawer from "@/components/ui/Drawer";
import { btnPrimary } from "@/components/ui/styles";
import type { StaffListItem, StaffRole } from "@/lib/actions/users";
import NewUserForm from "./NewUserForm";
import EditUserForm from "./EditUserForm";

export const ROLE_LABELS: Record<StaffRole, string> = { ADMIN: "Administrador", RECEPTIONIST: "Recepcionista", EVALUATOR: "Evaluador" };
const ROLE_STYLES: Record<StaffRole, string> = { ADMIN: "bg-primary/10 text-primary", RECEPTIONIST: "bg-warning/10 text-warning", EVALUATOR: "bg-success/10 text-success" };

export default function UsersPage({ users, currentUserId }: { users: StaffListItem[]; currentUserId: number }) {
  const [newOpen, setNewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = users.find((u) => u.id === editingId) ?? null; // derived: stays fresh after refresh

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Usuarios</h1>
          <p className="text-sm text-text-muted">Personal con acceso al sistema. Desactivar en vez de eliminar conserva su historial.</p>
        </div>
        <button type="button" onClick={() => setNewOpen(true)} className={btnPrimary}>+ Agregar usuario</button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-bg text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} onClick={() => setEditingId(u.id)} className={"cursor-pointer border-b border-border last:border-0 hover:bg-bg" + (u.active ? "" : " opacity-60")}>
                <td className="px-4 py-3 text-text">
                  {u.name} {u.id === currentUserId && <span className="text-text-muted">(tú)</span>}
                  <div className="text-xs text-text-muted sm:hidden">{u.email}</div>
                </td>
                <td className="hidden px-4 py-3 text-text-muted sm:table-cell">{u.email}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? "bg-success/10 text-success" : "bg-bg text-text-muted"}`}>{u.active ? "Activo" : "Desactivado"}</span></td>
                <td className="px-4 py-3 text-right text-primary">Editar</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer open={newOpen} onClose={() => setNewOpen(false)} title="Agregar usuario">
        {newOpen && <NewUserForm onCreated={() => setNewOpen(false)} />}
      </Drawer>
      <Drawer open={editing !== null} onClose={() => setEditingId(null)} title={editing?.name || "Editar usuario"}>
        {editing && <EditUserForm key={editing.id} user={editing} isSelf={editing.id === currentUserId} />}
      </Drawer>
    </div>
  );
}
