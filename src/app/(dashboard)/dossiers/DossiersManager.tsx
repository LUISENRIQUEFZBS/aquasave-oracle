"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DossierListItem } from "@/lib/actions/dossiers";
import { createDossier } from "@/lib/actions/dossiers";
import type { ClientWithSites } from "@/lib/actions/clients";
import { DOSSIER_STATUS_LABELS } from "@/lib/constants";
import { useAction } from "@/components/ui/useAction";
import Drawer from "@/components/ui/Drawer";
import { btnPrimary, errorText, input } from "@/components/ui/styles";

const BADGE: Record<number, string> = {
  1: "bg-primary/10 text-primary",
  2: "bg-success/10 text-success",
  3: "bg-danger/10 text-danger",
};

export function DossiersManager({ dossiers, clients }: { dossiers: DossierListItem[]; clients: ClientWithSites[] }) {
  const [open, setOpen] = useState(false);
  const n = dossiers.length;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Expedientes</h1>
          <p className="text-sm text-text-muted">
            {n} expediente{n === 1 ? "" : "s"} registrado{n === 1 ? "" : "s"}
          </p>
        </div>
        <button className={btnPrimary} onClick={() => setOpen(true)}>Nuevo expediente</button>
      </div>

      {n === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-text-muted">Todavía no hay expedientes.</p>
          <p className="mt-1 text-sm text-text-muted">Crea el primero con &ldquo;Nuevo expediente&rdquo;.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b border-border bg-bg text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Sede</th>
                <th className="px-4 py-3 font-medium">Productos</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {dossiers.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-text">
                    <Link href={`/dossiers/${d.id}`} className="inline-block py-1 hover:underline">{d.code}</Link>
                  </td>
                  <td className="px-4 py-3 text-text">{d.clientName}</td>
                  <td className="px-4 py-3 text-text-muted">{d.siteName}</td>
                  <td className="px-4 py-3 text-text-muted">{d.productCount}</td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (BADGE[d.status] ?? "bg-bg text-text-muted")}>
                      {DOSSIER_STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title="Nuevo expediente">
        <NewDossierForm clients={clients} />
      </Drawer>
    </div>
  );
}

function NewDossierForm({ clients }: { clients: ClientWithSites[] }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [clientId, setClientId] = useState<number | "">("");
  const [siteId, setSiteId] = useState<number | "">("");
  const [letter, setLetter] = useState("");
  const [notes, setNotes] = useState("");
  const sites = clients.find((c) => c.id === clientId)?.sites.filter((s) => s.status === 1) ?? [];
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (clientId === "" || siteId === "") return;
        run(async () => {
          const r = await createDossier({ clientId, siteId, letterRegistrationNumber: letter, notes });
          if (r.ok) router.push(`/dossiers/${r.data.id}`);
          return r;
        });
      }}
    >
      <select className={input} value={clientId} onChange={(e) => { setClientId(e.target.value ? Number(e.target.value) : ""); setSiteId(""); }} required>
        <option value="">Cliente…</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
      </select>
      <select className={input} value={siteId} onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : "")} required disabled={clientId === ""}>
        <option value="">Sede…</option>
        {sites.map((s) => <option key={s.id} value={s.id}>{s.label ? `${s.label} — ` : ""}{s.address}</option>)}
      </select>
      <input className={input} placeholder="N.º de registro de la carta (opcional)" value={letter} onChange={(e) => setLetter(e.target.value)} />
      <input className={input} placeholder="Observaciones (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button className={btnPrimary + " w-full"} disabled={pending}>{pending ? "Creando..." : "Crear expediente"}</button>
      {error && <p className={errorText}>{error}</p>}
    </form>
  );
}
