"use client";
import { useState } from "react";
import type { CatalogKind } from "@/lib/actions/catalogs";
import {
  createCatalogItem, renameCatalogItem, setCatalogItemStatus,
  createProductType, updateProductType, setProductTypeStatus,
  createReferenceVariant, setReferenceVariantStatus,
} from "@/lib/actions/catalogs";
import { useAction } from "@/components/ui/useAction";
import { btn, btnPrimary, card, input, muted } from "@/components/ui/styles";

type Item = { id: number; name: string; status: number };
type Variant = { id: number; label: string; referenceValue: number; requiresFlushTest: number; status: number };
type PType = { id: number; name: string; method: number; description: string | null; status: number; variants: Variant[] };

const METHOD_LABELS: Record<number, string> = { 1: "Comparativo", 2: "Referencia fija" };

export function CatalogsManager(props: { isAdmin: boolean; brands: Item[]; manufacturers: Item[]; countries: Item[]; types: PType[] }) {
  const [showInactive, setShowInactive] = useState(false);
  return (
    <div className="space-y-6">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Mostrar inactivos
      </label>
      <ProductTypes types={props.types} isAdmin={props.isAdmin} showInactive={showInactive} />
      <div className="grid gap-4 md:grid-cols-3">
        <NameCatalog kind="brand" title="Marcas" items={props.brands} {...props} showInactive={showInactive} />
        <NameCatalog kind="manufacturer" title="Fabricantes" items={props.manufacturers} {...props} showInactive={showInactive} />
        <NameCatalog kind="country" title="Países de origen" items={props.countries} {...props} showInactive={showInactive} />
      </div>
    </div>
  );
}

function NameCatalog({ kind, title, items, isAdmin, showInactive }: { kind: CatalogKind; title: string; items: Item[]; isAdmin: boolean; showInactive: boolean }) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");
  const visible = items.filter((i) => showInactive || i.status === 1);
  return (
    <div className={card + " space-y-2"}>
      <h2 className="font-medium">{title}</h2>
      {isAdmin && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createCatalogItem(kind, name), () => setName(""));
          }}
        >
          <input className={input} placeholder="Nuevo nombre" value={name} onChange={(e) => setName(e.target.value)} required />
          <button className={btnPrimary} disabled={pending}>+</button>
        </form>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <ul className="space-y-1">
        {visible.length === 0 && <li className={muted}>Sin registros.</li>}
        {visible.map((i) => (
          <NameRow key={i.id} kind={kind} item={i} isAdmin={isAdmin} />
        ))}
      </ul>
    </div>
  );
}

function NameRow({ kind, item, isAdmin }: { kind: CatalogKind; item: Item; isAdmin: boolean }) {
  const { pending, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const active = item.status === 1;
  return (
    <li className={"text-sm" + (active ? "" : " opacity-60")}>
      {editing ? (
        <form
          className="flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => renameCatalogItem(kind, item.id, name), () => setEditing(false));
          }}
        >
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          <button className={btnPrimary} disabled={pending}>OK</button>
          <button type="button" className={btn} onClick={() => setEditing(false)}>×</button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{item.name}{active ? "" : " (inactivo)"}</span>
          {isAdmin && (
            <span className="flex gap-1">
              <button className={btn} onClick={() => setEditing(true)}>Editar</button>
              <button className={btn} disabled={pending} onClick={() => run(() => setCatalogItemStatus(kind, item.id, active ? 2 : 1))}>
                {active ? "Desactivar" : "Activar"}
              </button>
            </span>
          )}
        </div>
      )}
      {error && <div className="text-danger">{error}</div>}
    </li>
  );
}

function ProductTypes({ types, isAdmin, showInactive }: { types: PType[]; isAdmin: boolean; showInactive: boolean }) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");
  const [method, setMethod] = useState(1);
  const [description, setDescription] = useState("");
  const visible = types.filter((t) => showInactive || t.status === 1);
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Tipos de producto</h2>
      {isAdmin && (
        <form
          className={card + " space-y-2"}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createProductType({ name, method, description }), () => { setName(""); setDescription(""); });
          }}
        >
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]">
            <input className={input} placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
            <select className={input} value={method} onChange={(e) => setMethod(Number(e.target.value))}>
              <option value={1}>Comparativo</option>
              <option value={2}>Referencia fija</option>
            </select>
            <input className={input} placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <button className={btnPrimary} disabled={pending}>Crear</button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      )}
      {visible.length === 0 && <p className={muted}>Sin tipos de producto.</p>}
      {visible.map((t) => (
        <TypeCard key={t.id} type={t} isAdmin={isAdmin} showInactive={showInactive} />
      ))}
    </div>
  );
}

function TypeCard({ type, isAdmin, showInactive }: { type: PType; isAdmin: boolean; showInactive: boolean }) {
  const { pending, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const [method, setMethod] = useState(type.method);
  const [description, setDescription] = useState(type.description ?? "");
  const active = type.status === 1;
  return (
    <div className={card + (active ? "" : " opacity-60")}>
      {editing ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => updateProductType(type.id, { name, method, description }), () => setEditing(false));
          }}
        >
          <input className={input + " flex-1"} value={name} onChange={(e) => setName(e.target.value)} required />
          <select className={input + " w-44"} value={method} onChange={(e) => setMethod(Number(e.target.value))}>
            <option value={1}>Comparativo</option>
            <option value={2}>Referencia fija</option>
          </select>
          <input className={input + " flex-1"} value={description} onChange={(e) => setDescription(e.target.value)} />
          <button className={btnPrimary} disabled={pending}>Guardar</button>
          <button type="button" className={btn} onClick={() => setEditing(false)}>Cancelar</button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-medium">{type.name}{active ? "" : " (inactivo)"}</div>
            <div className={muted}>{METHOD_LABELS[type.method]}{type.description ? ` · ${type.description}` : ""}</div>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={() => setEditing(true)}>Editar</button>
              <button className={btn} disabled={pending} onClick={() => run(() => setProductTypeStatus(type.id, active ? 2 : 1))}>
                {active ? "Desactivar" : "Activar"}
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {type.method === 2 && <Variants type={type} isAdmin={isAdmin} showInactive={showInactive} />}
    </div>
  );
}

function Variants({ type, isAdmin, showInactive }: { type: PType; isAdmin: boolean; showInactive: boolean }) {
  const { pending, error, run } = useAction();
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [flush, setFlush] = useState(false);
  const visible = type.variants.filter((v) => showInactive || v.status === 1);
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <div className="text-sm font-medium">Variantes de referencia</div>
      {visible.length === 0 && <p className={muted}>Sin variantes.</p>}
      {visible.map((v) => (
        <div key={v.id} className={"flex items-center justify-between text-sm" + (v.status === 1 ? "" : " opacity-60")}>
          <span>
            {v.label} — referencia {v.referenceValue} L{v.requiresFlushTest ? " · requiere prueba de descarga" : ""}
            {v.status === 1 ? "" : " (inactiva)"}
          </span>
          {isAdmin && (
            <button className={btn} disabled={pending} onClick={() => run(() => setReferenceVariantStatus(v.id, v.status === 1 ? 2 : 1))}>
              {v.status === 1 ? "Desactivar" : "Activar"}
            </button>
          )}
        </div>
      ))}
      {isAdmin && (
        <form
          className="grid gap-2 sm:grid-cols-[2fr_1fr_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createReferenceVariant(type.id, { label, referenceValue: Number(value), requiresFlushTest: flush }), () => { setLabel(""); setValue(""); setFlush(false); });
          }}
        >
          <input className={input} placeholder="Etiqueta (ej. Líquido)" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <input className={input} placeholder="Litros de ref." type="number" step="0.01" min="0.01" value={value} onChange={(e) => setValue(e.target.value)} required />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={flush} onChange={(e) => setFlush(e.target.checked)} /> Prueba de descarga
          </label>
          <button className={btnPrimary} disabled={pending}>Agregar</button>
        </form>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
