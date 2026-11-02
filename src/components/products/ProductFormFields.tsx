"use client";
import { input, muted } from "@/components/ui/styles";

export type Item = { id: number; name: string };
export type Variant = { id: number; label: string; referenceValue: number };
export type PType = { id: number; name: string; method: number; variants: Variant[] };

export type ProductFormState = {
  typeId: number | "";
  code: string;
  description: string;
  brandId: number | "";
  manufacturerId: number | "";
  countryId: number | "";
  usage: string;
  material: string;
  warranty: string;
  lpm: string;
  variantIds: number[];
};

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  typeId: "", code: "", description: "", brandId: "", manufacturerId: "", countryId: "",
  usage: "", material: "", warranty: "", lpm: "", variantIds: [],
};

const label = "text-sm font-medium text-text";
const sel = (v: string) => (v ? Number(v) : "");

export function formToInput(f: ProductFormState) {
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  return {
    productTypeId: f.typeId as number,
    code: f.code,
    description: f.description,
    brandId: f.brandId || null,
    manufacturerId: f.manufacturerId || null,
    originCountryId: f.countryId || null,
    usage: f.usage,
    material: f.material,
    warrantyYears: num(f.warranty),
    consumptionLpm: num(f.lpm),
    variantIds: f.variantIds,
  };
}

/** Same fields and order as the old app's form. `lockType` = type/variants can't change any more. */
export function ProductFormFields(props: {
  value: ProductFormState;
  onChange: (v: ProductFormState) => void;
  types: PType[];
  brands: Item[];
  manufacturers: Item[];
  countries: Item[];
  lockType?: boolean;
}) {
  const { value, onChange, types, brands, manufacturers, countries, lockType } = props;
  const set = <K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) => onChange({ ...value, [k]: v });
  const type = types.find((t) => t.id === value.typeId);
  const showVariants = type?.method === 2 && type.variants.length > 0;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className={label}>Tipo de producto</label>
        <select className={input} value={value.typeId} disabled={lockType}
          onChange={(e) => onChange({ ...value, typeId: sel(e.target.value), variantIds: [] })} required>
          <option value="">Selecciona un tipo</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {lockType && <p className={muted}>El producto ya fue despachado: no se puede cambiar el tipo.</p>}
      </div>

      {showVariants && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <div className={label}>Variantes de referencia a evaluar</div>
          <p className="text-xs text-text-muted">Selecciona cuáles aplican a esta unidad (puedes elegir más de una).</p>
          {type!.variants.map((v) => (
            <label key={v.id} className="flex min-h-11 items-center gap-2 text-sm text-text sm:min-h-0">
              <input type="checkbox" disabled={lockType} checked={value.variantIds.includes(v.id)}
                onChange={(e) => set("variantIds", e.target.checked ? [...value.variantIds, v.id] : value.variantIds.filter((x) => x !== v.id))} />
              {v.label} ({v.referenceValue} L)
            </label>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className={label}>Código</label>
          <input className={input} value={value.code} onChange={(e) => set("code", e.target.value.replace(/\s/g, ""))} required />
        </div>
        <div className="space-y-2">
          <label className={label}>Marca</label>
          <select className={input} value={value.brandId} onChange={(e) => set("brandId", sel(e.target.value))}>
            <option value="">Sin especificar</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className={label}>Descripción</label>
        <textarea className={input} rows={2} value={value.description} onChange={(e) => set("description", e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className={label}>Fabricante</label>
          <select className={input} value={value.manufacturerId} onChange={(e) => set("manufacturerId", sel(e.target.value))}>
            <option value="">Sin especificar</option>
            {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className={label}>Procedencia</label>
          <select className={input} value={value.countryId} onChange={(e) => set("countryId", sel(e.target.value))}>
            <option value="">Sin especificar</option>
            {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <p className="text-xs text-text-muted">¿No encuentras una marca, fabricante o procedencia? Pide a un administrador que la agregue en Catálogos.</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className={label}>Uso</label>
          <input className={input} placeholder="Ej. Lavamano, Ducha" value={value.usage} onChange={(e) => set("usage", e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className={label}>Material</label>
          <input className={input} value={value.material} onChange={(e) => set("material", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className={label}>Garantía (años)</label>
          <input className={input} type="number" min="0" max="99" inputMode="numeric" value={value.warranty} onChange={(e) => set("warranty", e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className={label}>Consumo (L/min)</label>
          <input className={input} type="number" step="0.01" min="0" inputMode="decimal" value={value.lpm} onChange={(e) => set("lpm", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
