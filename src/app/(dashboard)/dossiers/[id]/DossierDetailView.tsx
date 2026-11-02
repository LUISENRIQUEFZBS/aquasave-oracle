"use client";
import Link from "next/link";
import { useState } from "react";
import type { DossierDetail } from "@/lib/actions/dossiers";
import { updateDossier, setDossierStatus } from "@/lib/actions/dossiers";
import { receiveProduct } from "@/lib/actions/receptions";
import { createProduct, setProductStatus, uploadProductFile } from "@/lib/actions/products";
import { DOSSIER_STATUS_LABELS, PRODUCT_STAGE_LABELS } from "@/lib/constants";
import { useAction } from "@/components/ui/useAction";
import { btn, btnPrimary, card, errorText, input, muted } from "@/components/ui/styles";

type Item = { id: number; name: string };
type Variant = { id: number; label: string; referenceValue: number };
type PType = { id: number; name: string; method: number; variants: Variant[] };
type Product = DossierDetail["products"][number];

export function DossierDetailView(props: { detail: DossierDetail; types: PType[]; brands: Item[]; manufacturers: Item[]; countries: Item[] }) {
  const { dossier, clientName, siteName, products } = props.detail;
  const open = dossier.status === 1;
  return (
    <div className="space-y-4">
      <Header dossierId={dossier.id} code={dossier.code} status={dossier.status} clientName={clientName} siteName={siteName}
        letter={dossier.letterRegistrationNumber ?? ""} notes={dossier.notes ?? ""} />
      <h2 className="text-lg font-medium">Productos ({products.filter((p) => p.status === 1).length})</h2>
      {open && <NewProductForm dossierId={dossier.id} {...props} />}
      {!open && <p className={muted}>El expediente no está abierto: no se pueden agregar productos.</p>}
      {products.length === 0 && <p className={muted}>Sin productos todavía.</p>}
      {products.map((p) => <ProductCard key={p.id} product={p} dossierOpen={open} />)}
    </div>
  );
}

function Header(p: { dossierId: number; code: string; status: number; clientName: string; siteName: string; letter: string; notes: string }) {
  const { pending, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [letter, setLetter] = useState(p.letter);
  const [notes, setNotes] = useState(p.notes);
  return (
    <div className={card + " space-y-2"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{p.code}</h1>
        <select
          className={input + " sm:w-44"}
          value={p.status}
          disabled={pending}
          onChange={(e) => run(() => setDossierStatus(p.dossierId, Number(e.target.value)))}
          aria-label="Estado del expediente"
        >
          {[1, 2, 3].map((s) => <option key={s} value={s}>{DOSSIER_STATUS_LABELS[s]}</option>)}
        </select>
      </div>
      <div className="text-sm">{p.clientName} · {p.siteName}</div>
      {editing ? (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => updateDossier(p.dossierId, { letterRegistrationNumber: letter, notes }), () => setEditing(false)); }}>
          <input className={input} placeholder="N.º de registro de la carta" value={letter} onChange={(e) => setLetter(e.target.value)} />
          <textarea className={input} rows={3} placeholder="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} disabled={pending}>Guardar</button>
            <button type="button" className={btn} onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="space-y-1">
          <div className={muted}>Carta: {p.letter || "—"}</div>
          <div className={muted}>Observaciones: {p.notes || "—"}</div>
          <button className={btn} onClick={() => setEditing(true)}>Editar datos</button>
        </div>
      )}
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}

function NewProductForm(props: { dossierId: number; types: PType[]; brands: Item[]; manufacturers: Item[]; countries: Item[] }) {
  const { pending, error, run } = useAction();
  const empty = { typeId: "" as number | "", code: "", description: "", brandId: "" as number | "", manufacturerId: "" as number | "", countryId: "" as number | "", usage: "", material: "", warranty: "", lpm: "" };
  const [f, setF] = useState(empty);
  const [variantIds, setVariantIds] = useState<number[]>([]);
  const type = props.types.find((t) => t.id === f.typeId);
  const num = (v: string) => (v === "" ? null : Number(v));
  const sel = (v: string) => (v ? Number(v) : "");
  return (
    <form
      className={card + " space-y-2"}
      onSubmit={(e) => {
        e.preventDefault();
        if (f.typeId === "") return;
        run(
          () => createProduct(props.dossierId, {
            productTypeId: f.typeId as number, code: f.code, description: f.description,
            brandId: f.brandId || null, manufacturerId: f.manufacturerId || null, originCountryId: f.countryId || null,
            usage: f.usage, material: f.material, warrantyYears: num(f.warranty), consumptionLpm: num(f.lpm), variantIds,
          }),
          () => { setF(empty); setVariantIds([]); },
        );
      }}
    >
      <h3 className="font-medium">Agregar producto</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className={input} value={f.typeId} onChange={(e) => { setF({ ...f, typeId: sel(e.target.value) }); setVariantIds([]); }} required>
          <option value="">Tipo de producto…</option>
          {props.types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input className={input} placeholder="Código (ej. P-001)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} required />
        <input className={input + " sm:col-span-2"} placeholder="Descripción" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required />
        <select className={input} value={f.brandId} onChange={(e) => setF({ ...f, brandId: sel(e.target.value) })}>
          <option value="">Marca (opcional)</option>
          {props.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className={input} value={f.manufacturerId} onChange={(e) => setF({ ...f, manufacturerId: sel(e.target.value) })}>
          <option value="">Fabricante (opcional)</option>
          {props.manufacturers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className={input} value={f.countryId} onChange={(e) => setF({ ...f, countryId: sel(e.target.value) })}>
          <option value="">País de origen (opcional)</option>
          {props.countries.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input className={input} placeholder="Uso" value={f.usage} onChange={(e) => setF({ ...f, usage: e.target.value })} />
        <input className={input} placeholder="Material" value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })} />
        <input className={input} placeholder="Años de garantía" type="number" min="0" max="99" inputMode="numeric" value={f.warranty} onChange={(e) => setF({ ...f, warranty: e.target.value })} />
        <input className={input} placeholder="Consumo (L/min)" type="number" step="0.01" min="0" inputMode="decimal" value={f.lpm} onChange={(e) => setF({ ...f, lpm: e.target.value })} />
      </div>
      {type?.method === 2 && (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Variantes de referencia</legend>
          {type.variants.length === 0 && <p className={muted}>Este tipo no tiene variantes activas.</p>}
          {type.variants.map((v) => (
            <label key={v.id} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
              <input type="checkbox" checked={variantIds.includes(v.id)}
                onChange={(e) => setVariantIds(e.target.checked ? [...variantIds, v.id] : variantIds.filter((x) => x !== v.id))} />
              {v.label} ({v.referenceValue} L)
            </label>
          ))}
        </fieldset>
      )}
      <button className={btnPrimary + " w-full sm:w-auto"} disabled={pending}>Agregar producto</button>
      {error && <p className={errorText}>{error}</p>}
    </form>
  );
}

function ProductCard({ product: p, dossierOpen }: { product: Product; dossierOpen: boolean }) {
  const { pending, error, run } = useAction();
  const active = p.status === 1;
  return (
    <div className={card + " space-y-2" + (active ? "" : " opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium">{p.code} · {p.typeName}{active ? "" : " (inactivo)"}</div>
          <div className="text-sm">{p.description}</div>
          <div className={muted}>
            {[p.brandName, p.manufacturerName, p.originCountryName].filter(Boolean).join(" · ") || "Sin marca/fabricante/país"}
            {" · Etapa: "}{PRODUCT_STAGE_LABELS[p.currentStage] ?? p.currentStage}
            {p.variantLabels.length ? ` · Variantes: ${p.variantLabels.join(", ")}` : ""}
          </div>
        </div>
        <button className={btn} disabled={pending} onClick={() => run(() => setProductStatus(p.id, active ? 2 : 1))}>
          {active ? "Desactivar" : "Activar"}
        </button>
      </div>
      {error && <p className={errorText}>{error}</p>}
      {active && <ReceptionBlock product={p} dossierOpen={dossierOpen} />}
      {active && p.currentStage >= 2 && (
        <Link href={`/dossiers/${p.dossierId}/products/${p.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline sm:min-h-0">
          Evaluaciones →
        </Link>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <FileSlot productId={p.id} kind="photo" label="Foto (JPG/PNG)" accept="image/jpeg,image/png" path={p.photoPath} />
        <FileSlot productId={p.id} kind="techSheet" label="Ficha técnica (PDF)" accept="application/pdf" path={p.techSheetPath} />
      </div>
    </div>
  );
}

function FileSlot({ productId, kind, label, accept, path }: { productId: number; kind: "photo" | "techSheet"; label: string; accept: string; path: string | null }) {
  const { pending, error, run } = useAction();
  const url = path ? `/api/files/${path.split("/").map(encodeURIComponent).join("/")}` : null;
  return (
    <div className="space-y-1 rounded border border-dashed border-border p-2">
      <div className="text-sm font-medium">{label}</div>
      {url && kind === "photo" && (
        // eslint-disable-next-line @next/next/no-img-element
        <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} className="h-32 w-full rounded object-cover" /></a>
      )}
      {url && kind === "techSheet" && <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Ver ficha técnica</a>}
      {!url && <div className={muted}>Sin archivo.</div>}
      <form onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); run(() => uploadProductFile(productId, kind, fd), () => form.reset()); }}
        className="flex flex-wrap items-center gap-2">
        {/* capture lets phones open the camera directly for the photo */}
        <input name="file" type="file" accept={accept} {...(kind === "photo" ? { capture: "environment" as const } : {})} className="min-w-0 flex-1 text-sm" required />
        <button className={btn} disabled={pending}>{url ? "Reemplazar" : "Subir"}</button>
      </form>
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}

function ReceptionBlock({ product: p, dossierOpen }: { product: Product; dossierOpen: boolean }) {
  const { pending, error, run } = useAction();
  const [expected, setExpected] = useState(p.reception?.expected ?? true);
  const [notes, setNotes] = useState(p.reception?.notes ?? "");
  const r = p.reception;
  if (r?.present) {
    return (
      <div className="rounded border border-border bg-bg p-2 text-sm">
        <span className="font-medium">Recibido</span> el {r.receivedAt ?? "—"} por {r.receiverName ?? "—"}
        {!r.expected && " · no figuraba en la lista del cliente"}
        {r.notes ? ` · ${r.notes}` : ""}
      </div>
    );
  }
  if (!dossierOpen) return null;
  return (
    <form className="space-y-2 rounded border border-dashed border-border p-2" onSubmit={(e) => e.preventDefault()}>
      <div className="text-sm font-medium">Recepción</div>
      {r && !r.present && <p className={muted}>Registrado como no recibido{r.notes ? `: ${r.notes}` : ""}.</p>}
      <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
        <input type="checkbox" checked={expected} onChange={(e) => setExpected(e.target.checked)} />
        Figuraba en la lista del cliente
      </label>
      <input className={input} placeholder="Notas (estado del producto, faltantes...)" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={pending}
          onClick={() => run(() => receiveProduct(p.id, { present: true, expected, notes }))}>Marcar recibido</button>
        <button type="button" className={btn} disabled={pending}
          onClick={() => run(() => receiveProduct(p.id, { present: false, expected, notes }))}>No llegó</button>
      </div>
      {error && <p className={errorText}>{error}</p>}
    </form>
  );
}
