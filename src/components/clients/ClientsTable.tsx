"use client";
import { useState } from "react";
import Drawer from "@/components/ui/Drawer";
import { useAction } from "@/components/ui/useAction";
import { btn, btnPrimary, input, muted } from "@/components/ui/styles";
import { createClient, updateClient, setClientStatus, createSite, type ClientWithSites } from "@/lib/actions/clients";
import ClientSites from "./ClientSites";
import ClientUsersSection from "./ClientUsersSection";

export default function ClientsTable({ clients }: { clients: ClientWithSites[] }) {
  const [showInactive, setShowInactive] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  // Derived from the fresh prop on every render, so router refreshes update the open drawer.
  const editing = clients.find((c) => c.id === editingId) ?? null;
  const visible = clients.filter((c) => showInactive || c.status === 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Clientes</h1>
          <p className="text-sm text-text-muted">{visible.length} cliente{visible.length === 1 ? "" : "s"}</p>
        </div>
        <button type="button" onClick={() => setNewOpen(true)} className={btnPrimary}>+ Nuevo cliente</button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar inactivos
      </label>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center"><p className={muted}>No hay clientes.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-bg text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Razón social</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">RUC</th>
                <th className="px-4 py-3 font-medium">Sedes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} onClick={() => setEditingId(c.id)} className={"cursor-pointer border-b border-border last:border-0 hover:bg-bg" + (c.status === 1 ? "" : " opacity-60")}>
                  <td className="px-4 py-3 font-medium text-text">{c.businessName}{c.status === 1 ? "" : " (inactivo)"}</td>
                  <td className="hidden px-4 py-3 text-text-muted sm:table-cell">{c.ruc || "—"}</td>
                  <td className="px-4 py-3 text-text-muted">{c.sites.filter((s) => s.status === 1).length}</td>
                  <td className="px-4 py-3 text-right text-primary">Editar</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={newOpen} onClose={() => setNewOpen(false)} title="Nuevo cliente">
        {newOpen && <NewClientForm onCreated={() => setNewOpen(false)} />}
      </Drawer>
      <Drawer open={editing !== null} onClose={() => setEditingId(null)} title={editing?.businessName || "Cliente"}>
        {editing && (
          <div className="space-y-8">
            <ClientDataForm client={editing} />
            <ClientSites client={editing} />
            {editing.status === 1 && <ClientUsersSection clientId={editing.id} />}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function NewClientForm({ onCreated }: { onCreated: () => void }) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");
  const [ruc, setRuc] = useState("");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        run(async () => {
          const c = await createClient({ businessName: name, ruc });
          if (!c.ok) return c;
          const s = await createSite(c.data.id, { label: "", address, contactName: "", contactPhone: "", contactEmail: "" });
          if (!s.ok) return { ok: false as const, error: `Cliente creado, pero la sede falló: ${s.error} Agrégala desde Editar.` };
          return c;
        }, onCreated);
      }}
    >
      <label className="block space-y-1.5"><span className="text-sm font-medium">Razón social</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej. Helvex Peru S.A." /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium">RUC <span className="font-normal text-text-muted">(opcional)</span></span>
        <input className={input} value={ruc} onChange={(e) => setRuc(e.target.value)} inputMode="numeric" /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium">Dirección de la primera sede</span>
        <input className={input} value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Ej. Av. Tomas Marsano 417, Surquillo" /></label>
      {(error || msg) && <p className="text-sm text-danger" role="alert">{error ?? msg}</p>}
      <button className={btnPrimary + " w-full"} disabled={pending}>{pending ? "Creando..." : "Crear cliente"}</button>
    </form>
  );
}

function ClientDataForm({ client }: { client: ClientWithSites }) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState(client.businessName);
  const [ruc, setRuc] = useState(client.ruc ?? "");
  const [saved, setSaved] = useState(false);
  const active = client.status === 1;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-text">Datos del cliente</h3>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          run(() => updateClient(client.id, { businessName: name, ruc }), () => { setSaved(true); setTimeout(() => setSaved(false), 2000); });
        }}
      >
        <label className="block space-y-1.5"><span className="text-sm font-medium">Razón social</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium">RUC</span>
          <input className={input} value={ruc} onChange={(e) => setRuc(e.target.value)} inputMode="numeric" /></label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex items-center gap-3">
          <button className={btnPrimary} disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button>
          {saved && <span className="text-sm text-success">Guardado</span>}
        </div>
      </form>
      <DeactivateButton id={client.id} active={active} />
    </section>
  );
}

function DeactivateButton({ id, active }: { id: number; active: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <div>
      <button type="button" className={btn + (active ? " text-danger" : " text-primary")} disabled={pending} onClick={() => run(() => setClientStatus(id, active ? 2 : 1))}>
        {active ? "Desactivar cliente" : "Reactivar cliente"}
      </button>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
