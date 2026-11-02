"use client";
import { useState } from "react";
import type { ClientWithSites } from "@/lib/actions/clients";
import { createClient, updateClient, setClientStatus, createSite, setSiteStatus } from "@/lib/actions/clients";
import { useAction } from "@/components/ui/useAction";
import { btn, btnPrimary, card, input, muted } from "@/components/ui/styles";

export function ClientsManager({ clients }: { clients: ClientWithSites[] }) {
  const [showInactive, setShowInactive] = useState(false);
  const visible = clients.filter((c) => showInactive || c.status === 1);
  return (
    <div className="space-y-4">
      <NewClientForm />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Mostrar inactivos
      </label>
      {visible.length === 0 && <p className={muted}>No hay clientes.</p>}
      {visible.map((c) => (
        <ClientCard key={c.id} client={c} />
      ))}
    </div>
  );
}

function NewClientForm() {
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");
  const [ruc, setRuc] = useState("");
  return (
    <form
      className={card + " space-y-2"}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createClient({ businessName: name, ruc }), () => { setName(""); setRuc(""); });
      }}
    >
      <h2 className="font-medium">Nuevo cliente</h2>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
        <input className={input} placeholder="Razón social" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={input} placeholder="RUC (opcional)" value={ruc} onChange={(e) => setRuc(e.target.value)} />
        <button className={btnPrimary} disabled={pending}>Crear</button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}

function ClientCard({ client }: { client: ClientWithSites }) {
  const { pending, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client.businessName);
  const [ruc, setRuc] = useState(client.ruc ?? "");
  const active = client.status === 1;
  return (
    <div className={card + (active ? "" : " opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editing ? (
          <form
            className="flex flex-1 flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateClient(client.id, { businessName: name, ruc }), () => setEditing(false));
            }}
          >
            <input className={input + " flex-1"} value={name} onChange={(e) => setName(e.target.value)} required />
            <input className={input + " w-40"} placeholder="RUC" value={ruc} onChange={(e) => setRuc(e.target.value)} />
            <button className={btnPrimary} disabled={pending}>Guardar</button>
            <button type="button" className={btn} onClick={() => setEditing(false)}>Cancelar</button>
          </form>
        ) : (
          <div>
            <div className="font-medium">{client.businessName}</div>
            <div className={muted}>RUC: {client.ruc ?? "—"} · {client.sites.length} sede(s){active ? "" : " · INACTIVO"}</div>
          </div>
        )}
        {!editing && (
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={() => setEditing(true)}>Editar</button>
            <button className={btn} disabled={pending} onClick={() => run(() => setClientStatus(client.id, active ? 2 : 1))}>
              {active ? "Desactivar" : "Activar"}
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm">Sedes</summary>
        <div className="mt-2 space-y-2">
          {client.sites.map((s) => (
            <SiteRow key={s.id} site={s} />
          ))}
          {active && <NewSiteForm clientId={client.id} />}
        </div>
      </details>
    </div>
  );
}

function SiteRow({ site }: { site: ClientWithSites["sites"][number] }) {
  const { pending, error, run } = useAction();
  const active = site.status === 1;
  return (
    <div className={"flex flex-wrap items-center justify-between gap-2 rounded border border-border px-3 py-2 text-sm" + (active ? "" : " opacity-60")}>
      <div>
        <div>{site.label ? `${site.label} — ` : ""}{site.address}</div>
        <div className={muted}>
          {[site.contactName, site.contactPhone, site.contactEmail].filter(Boolean).join(" · ") || "Sin contacto"}
          {active ? "" : " · INACTIVA"}
        </div>
        {error && <div className="text-danger">{error}</div>}
      </div>
      <button className={btn} disabled={pending} onClick={() => run(() => setSiteStatus(site.id, active ? 2 : 1))}>
        {active ? "Desactivar" : "Activar"}
      </button>
    </div>
  );
}

function NewSiteForm({ clientId }: { clientId: number }) {
  const { pending, error, run } = useAction();
  const empty = { label: "", address: "", contactName: "", contactPhone: "", contactEmail: "" };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="space-y-2 rounded border border-dashed border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createSite(clientId, f), () => setF(empty));
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={input} placeholder="Etiqueta (ej. Planta Lurín)" value={f.label} onChange={set("label")} />
        <input className={input} placeholder="Dirección" value={f.address} onChange={set("address")} required />
        <input className={input} placeholder="Contacto" value={f.contactName} onChange={set("contactName")} />
        <input className={input} placeholder="Teléfono" value={f.contactPhone} onChange={set("contactPhone")} />
        <input className={input} placeholder="Correo" type="email" value={f.contactEmail} onChange={set("contactEmail")} />
        <button className={btnPrimary} disabled={pending}>Agregar sede</button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
