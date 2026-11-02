"use client";
import { useState } from "react";
import type { ClientWithSites } from "@/lib/actions/clients";
import { createSite, setSiteStatus } from "@/lib/actions/clients";
import { useAction } from "@/components/ui/useAction";
import { btn, btnPrimary, input, muted } from "@/components/ui/styles";

type Site = ClientWithSites["sites"][number];

export default function ClientSites({ client }: { client: ClientWithSites }) {
  const active = client.status === 1;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-text">Sedes</h3>
      {client.sites.length === 0 && <p className={muted}>Sin sedes.</p>}
      {client.sites.map((s) => (
        <SiteRow key={s.id} site={s} />
      ))}
      {active && <NewSiteForm clientId={client.id} />}
    </section>
  );
}

function SiteRow({ site }: { site: Site }) {
  const { pending, error, run } = useAction();
  const active = site.status === 1;
  return (
    <div className={"space-y-1 rounded-md border border-border p-3 text-sm" + (active ? "" : " opacity-60")}>
      <div className="font-medium text-text">{site.label ? `${site.label} - ` : ""}{site.address}</div>
      <div className={muted}>
        {[site.contactName, site.contactPhone, site.contactEmail].filter(Boolean).join(" · ") || "Sin contacto"}
        {active ? "" : " · INACTIVA"}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
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
  const [open, setOpen] = useState(false);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  if (!open) {
    return <button type="button" className="min-h-11 text-sm font-medium text-primary hover:underline sm:min-h-0" onClick={() => setOpen(true)}>+ Agregar sede</button>;
  }
  return (
    <form
      className="space-y-2 rounded-md border border-dashed border-primary/50 bg-primary/5 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createSite(clientId, f), () => { setF(empty); setOpen(false); });
      }}
    >
      <input className={input} placeholder="Etiqueta (ej. Planta Lurin)" value={f.label} onChange={set("label")} />
      <input className={input} placeholder="Direccion" value={f.address} onChange={set("address")} required />
      <input className={input} placeholder="Contacto" value={f.contactName} onChange={set("contactName")} />
      <input className={input} placeholder="Telefono" value={f.contactPhone} onChange={set("contactPhone")} inputMode="tel" />
      <input className={input} placeholder="Correo" type="email" value={f.contactEmail} onChange={set("contactEmail")} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={pending}>{pending ? "Guardando..." : "Agregar sede"}</button>
        <button type="button" className={btn} onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </form>
  );
}
