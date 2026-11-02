"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/components/ui/useAction";
import { confirmToast } from "@/lib/confirm-toast";
import { createCatalogItem, renameCatalogItem, setCatalogItemStatus, type CatalogKind } from "@/lib/actions/catalogs";

type CatalogItem = { id: number; name: string; status: number };
type Tab = "brand" | "manufacturer" | "country";

const TABS: { key: Tab; label: string; singular: string; fem: boolean }[] = [
  { key: "brand", label: "Marcas", singular: "marca", fem: true },
  { key: "manufacturer", label: "Fabricantes", singular: "fabricante", fem: false },
  { key: "country", label: "Procedencias", singular: "procedencia", fem: true },
];

const field = "flex-1 min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-base focus:border-primary focus:outline-none sm:py-1.5 sm:text-sm";

export default function CatalogsPage(props: {
  isAdmin: boolean;
  brands: CatalogItem[];
  manufacturers: CatalogItem[];
  countries: CatalogItem[];
  usage: Record<Tab, Record<string, number>>;
}) {
  const [tab, setTab] = useState<Tab>("brand");
  const [showInactive, setShowInactive] = useState(false);
  const items = { brand: props.brands, manufacturer: props.manufacturers, country: props.countries }[tab];
  const meta = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text">Catálogos</h1>
        <p className="text-sm text-text-muted">
          Listas gestionadas por administradores — se usan como selectores al crear productos, para mantener nombres consistentes.
          {!props.isAdmin && " (Solo lectura: se requiere rol Administrador para modificar.)"}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`min-h-11 whitespace-nowrap px-4 py-2 text-sm font-medium sm:min-h-0 ${tab === t.key ? "border-b-2 border-primary text-primary" : "text-text-muted hover:text-text"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <CatalogList key={tab} kind={tab} items={items} usage={props.usage[tab]} meta={meta} isAdmin={props.isAdmin}
        showInactive={showInactive} onToggleInactive={setShowInactive} />
    </div>
  );
}

function CatalogList({ kind, items, usage, meta, isAdmin, showInactive, onToggleInactive }: {
  kind: CatalogKind; items: CatalogItem[]; usage: Record<string, number>; meta: (typeof TABS)[number];
  isAdmin: boolean; showInactive: boolean; onToggleInactive: (v: boolean) => void;
}) {
  const [adding, setAdding] = useState(false);
  const visible = items.filter((i) => showInactive || i.status === 1);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-11 items-center gap-2 text-sm text-text-muted sm:min-h-0">
          <input type="checkbox" checked={showInactive} onChange={(e) => onToggleInactive(e.target.checked)} /> Mostrar inactivos
        </label>
        {isAdmin && (
          <button type="button" onClick={() => setAdding(true)} className="min-h-11 text-sm font-medium text-primary hover:underline sm:min-h-0">
            + Agregar {meta.singular}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {adding && <NewItemRow kind={kind} singular={meta.singular} fem={meta.fem} onDone={() => setAdding(false)} />}
        {visible.map((item) => <ItemRow key={item.id} kind={kind} item={item} count={usage[String(item.id)] ?? 0} isAdmin={isAdmin} />)}
        {visible.length === 0 && !adding && (
          <p className="text-sm text-text-muted">Todavía no hay {meta.singular}s registrad{meta.fem ? "as" : "os"}.</p>
        )}
      </div>
    </div>
  );
}

function ItemRow({ kind, item, count, isAdmin }: { kind: CatalogKind; item: CatalogItem; count: number; isAdmin: boolean }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [name, setName] = useState(item.name);
  const active = item.status === 1;
  const dirty = name.trim() !== item.name;

  async function toggle() {
    if (active && !(await confirmToast(`¿Desactivar "${item.name}"? Dejará de aparecer al crear productos.`))) return;
    run(() => setCatalogItemStatus(kind, item.id, active ? 2 : 1), () => router.refresh());
  }

  return (
    <div className={"flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-2" + (active ? "" : " opacity-60")}>
      <input value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} className={field} aria-label="Nombre" />
      <span className="whitespace-nowrap text-xs text-text-muted">{count} producto{count === 1 ? "" : "s"}{active ? "" : " · inactivo"}</span>
      {isAdmin && dirty && (
        <button type="button" disabled={pending} onClick={() => run(() => renameCatalogItem(kind, item.id, name), () => router.refresh())}
          className="min-h-11 rounded-md border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50 sm:min-h-0">
          Guardar
        </button>
      )}
      {isAdmin && (
        <button type="button" disabled={pending} onClick={toggle}
          className={"min-h-11 rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50 sm:min-h-0 " + (active ? "text-danger hover:bg-danger/5" : "text-primary hover:bg-primary/5")}>
          {active ? "Desactivar" : "Activar"}
        </button>
      )}
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </div>
  );
}

function NewItemRow({ kind, singular, fem, onDone }: { kind: CatalogKind; singular: string; fem: boolean; onDone: () => void }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");
  return (
    <form className="space-y-2 rounded-md border border-dashed border-primary/50 bg-primary/5 p-2"
      onSubmit={(e) => { e.preventDefault(); run(() => createCatalogItem(kind, name), () => { router.refresh(); onDone(); }); }}>
      <div className="flex flex-wrap items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nombre de ${fem ? "la" : "el"} ${singular}`} className={field} autoFocus required />
        <button disabled={pending} className="min-h-11 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-50 sm:min-h-0">
          {pending ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-md px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-bg sm:min-h-0">Cancelar</button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
