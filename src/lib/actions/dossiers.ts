"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { insertReturningId } from "@/lib/db-helpers";
import { nextSequential } from "@/lib/files";
import { attempt } from "@/lib/result";
import { Client } from "@/entities/Client";
import { Site } from "@/entities/Site";
import { Dossier } from "@/entities/Dossier";
import { Product } from "@/entities/Product";
import { Reception } from "@/entities/Reception";
import { ProductVariant } from "@/entities/ProductVariant";
import { ReferenceVariant } from "@/entities/ReferenceVariant";
import { ProductType } from "@/entities/ProductType";
import { Brand } from "@/entities/Brand";
import { Manufacturer } from "@/entities/Manufacturer";
import { OriginCountry } from "@/entities/OriginCountry";
import { createAudit, updateAudit } from "@/entities/_audit";
import { DOSSIER_STATUS } from "@/lib/constants";
import { requireInternal, text, validId } from "./_guards";

export async function listDossiers() {
  await requireInternal();
  const db = await getDb();
  const [dossiers, clients, sites, counts] = await Promise.all([
    db.getRepository(Dossier).find({ order: { id: "DESC" } }),
    db.getRepository(Client).find(),
    db.getRepository(Site).find(),
    db.query("SELECT NCODEXPEDIENTE AS D, COUNT(*) AS N FROM AQUA_PRODUCTO WHERE NESTADO = 1 GROUP BY NCODEXPEDIENTE"),
  ]);
  const clientName = new Map(clients.map((c) => [c.id, c.businessName]));
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const count = new Map<number, number>(counts.map((r: { D: number; N: number }) => [Number(r.D), Number(r.N)]));
  return dossiers.map((d) => ({
    ...d,
    clientName: clientName.get(d.clientId) ?? "—",
    siteName: siteById.get(d.siteId)?.label || siteById.get(d.siteId)?.address || "—",
    productCount: count.get(d.id) ?? 0,
  }));
}
export type DossierListItem = Awaited<ReturnType<typeof listDossiers>>[number];

export async function getDossierDetail(id: number) {
  await requireInternal();
  const db = await getDb();
  const dossier = await db.getRepository(Dossier).findOne({ where: { id: validId(id) } });
  if (!dossier) return null;
  const [client, site, products, types, brands, manufacturers, countries] = await Promise.all([
    db.getRepository(Client).findOne({ where: { id: dossier.clientId } }),
    db.getRepository(Site).findOne({ where: { id: dossier.siteId } }),
    db.getRepository(Product).find({ where: { dossierId: dossier.id }, order: { id: "ASC" } }),
    db.getRepository(ProductType).find(),
    db.getRepository(Brand).find(),
    db.getRepository(Manufacturer).find(),
    db.getRepository(OriginCountry).find(),
  ]);
  const productIds = products.map((p) => p.id);
  const links = productIds.length
    ? await db.getRepository(ProductVariant).find({ where: productIds.map((productId) => ({ productId })) })
    : [];
  const variants = await db.getRepository(ReferenceVariant).find();
  const receptions = productIds.length
    ? await db.getRepository(Reception).find({ where: productIds.map((productId) => ({ productId })) })
    : [];
  const receiverIds = [...new Set(receptions.map((r) => r.receiverUserId).filter((x): x is number => !!x))];
  const receiverRows: { ID: number; NAME: string }[] = receiverIds.length
    ? await db.query(`SELECT NCODUSUARIO AS ID, VNOMBRE AS NAME FROM AQUA_USUARIO_INTERNO WHERE NCODUSUARIO IN (${receiverIds.map((_, i) => `:${i + 1}`).join(",")})`, receiverIds)
    : [];
  const receiverName = new Map(receiverRows.map((r) => [Number(r.ID), r.NAME]));
  const name = (list: { id: number; name: string }[]) => new Map(list.map((x) => [x.id, x.name]));
  const typeName = name(types), brandName = name(brands), manName = name(manufacturers), countryName = name(countries);
  const variantLabel = new Map(variants.map((v) => [v.id, v.label]));
  return {
    dossier,
    clientName: client?.businessName ?? "—",
    siteName: site ? `${site.label ? site.label + " — " : ""}${site.address}` : "—",
    products: products.map((p) => ({
      ...p,
      typeName: typeName.get(p.productTypeId) ?? "—",
      brandName: p.brandId ? brandName.get(p.brandId) ?? null : null,
      manufacturerName: p.manufacturerId ? manName.get(p.manufacturerId) ?? null : null,
      originCountryName: p.originCountryId ? countryName.get(p.originCountryId) ?? null : null,
      reception: (() => {
        const r = receptions.find((x) => x.productId === p.id);
        return r
          ? { present: r.present === 1, expected: r.expected === 1, receivedAt: r.receivedAt, notes: r.notes,
              receiverName: r.receiverUserId ? receiverName.get(r.receiverUserId) ?? null : null }
          : null;
      })(),
      variantLabels: links.filter((l) => l.productId === p.id).map((l) => variantLabel.get(l.variantId) ?? "?"),
    })),
  };
}
export type DossierDetail = NonNullable<Awaited<ReturnType<typeof getDossierDetail>>>;

export async function createDossier(input: { clientId: number; siteId: number; letterRegistrationNumber?: string; notes?: string }) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const client = await db.getRepository(Client).findOne({ where: { id: validId(input.clientId, "Cliente") } });
    if (!client || client.status !== 1) throw new Error("Cliente no encontrado o inactivo.");
    const site = await db.getRepository(Site).findOne({ where: { id: validId(input.siteId, "Sede") } });
    if (!site || site.status !== 1 || site.clientId !== client.id) throw new Error("La sede no pertenece a ese cliente o está inactiva.");
    const letter = text(input.letterRegistrationNumber, "El N.º de registro de la carta", 100);
    const notes = text(input.notes, "Las observaciones", 2000);
    // Provisional: code numbering from AQUA_SECUENCIAL type "EPA" (confirm with IT). Format EPA-0001-2026.
    const year = new Date().getFullYear();
    const n = await nextSequential("EPA", s.audit, year);
    const code = `EPA-${String(n).padStart(4, "0")}-${year}`;
    const id = await insertReturningId(db.manager, Dossier, {
      code,
      clientId: client.id,
      siteId: site.id,
      letterRegistrationNumber: letter,
      notes,
      creatorUserId: s.userId,
      ...createAudit(s.audit),
      status: DOSSIER_STATUS.OPEN,
    });
    revalidatePath("/");
    return { id, code };
  });
}

export async function updateDossier(id: number, input: { letterRegistrationNumber?: string; notes?: string }) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    await db.getRepository(Dossier).update(
      { id: validId(id) },
      {
        letterRegistrationNumber: text(input.letterRegistrationNumber, "El N.º de registro de la carta", 100),
        notes: text(input.notes, "Las observaciones", 2000),
        ...updateAudit(s.audit),
      },
    );
    revalidatePath(`/dossiers/${id}`);
  });
}

export async function setDossierStatus(id: number, status: number) {
  return attempt(async () => {
    const s = await requireInternal();
    if (![1, 2, 3].includes(status)) throw new Error("Estado inválido.");
    const db = await getDb();
    await db.getRepository(Dossier).update({ id: validId(id) }, { status, ...updateAudit(s.audit) });
    revalidatePath(`/dossiers/${id}`);
    revalidatePath("/");
  });
}
