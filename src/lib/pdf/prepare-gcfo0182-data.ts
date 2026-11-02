// Data for the GCFO0182 form PDF, read straight from Oracle (server only).
// The types are the same ones Gcfo0182Document.tsx (verbatim from the old app) expects.
import { readFile } from "fs/promises";
import path from "path";
import { In } from "typeorm";
import { getDb } from "@/lib/db";
import { readStoredFile } from "@/lib/files";
import { Dossier } from "@/entities/Dossier";
import { Client } from "@/entities/Client";
import { Site } from "@/entities/Site";
import { Product } from "@/entities/Product";
import { ProductType } from "@/entities/ProductType";
import { Brand } from "@/entities/Brand";
import { Manufacturer } from "@/entities/Manufacturer";
import { OriginCountry } from "@/entities/OriginCountry";

// Past this many products, photo bytes are not embedded (row data stays complete): keeps the PDF small and fast.
const MAX_EMBEDDED_PHOTOS = 10;

export type Gcfo0182ProductData = {
  submittedCode: string | null;
  description: string;
  productTypeName: string | null;
  model: string | null;
  brandNameSubmitted: string | null;
  manufacturerNameSubmitted: string | null;
  originCountryNameSubmitted: string | null;
  use: string | null;
  warrantyYears: number | null;
  photoBuffer: Buffer | null;
  photoSkippedDueToLimit: boolean;
  hasDatasheet: boolean;
};

export type Gcfo0182PdfData = {
  submissionCode: string;
  generatedAt: Date;
  client: { businessName: string; taxId: string | null };
  location: { label: string | null; address: string };
  generalInfo: {
    registryFileNumber: string | null;
    address: string | null;
    district: string | null;
    province: string | null;
    department: string | null;
    legalRepresentativeName: string | null;
    companyPhone: string | null;
    companyEmail: string | null;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    observations: string | null;
    termsAcceptedAt: Date | null;
  } | null;
  products: Gcfo0182ProductData[];
  sedapalLogo: Buffer | null;
  showTermsAcceptance: boolean; // false for a dossier created internally: nobody "accepted terms" in the portal
};

async function loadPhoto(rel: string | null): Promise<Buffer | null> {
  if (!rel) return null;
  try {
    return await readStoredFile(rel);
  } catch {
    return null; // one missing/undecodable photo must not break the whole form
  }
}

async function loadLogo(): Promise<Buffer | null> {
  try {
    return await readFile(/* turbopackIgnore: true */ path.join(process.cwd(), "public", "logos", "logo-sedapal.png"));
  } catch {
    return null;
  }
}

export async function prepareDossierGcfo0182PdfData(dossierId: number): Promise<Gcfo0182PdfData> {
  const db = await getDb();
  const dossier = await db.getRepository(Dossier).findOne({ where: { id: dossierId } });
  if (!dossier) throw new Error("Expediente no encontrado.");
  const [client, site, products, types] = await Promise.all([
    db.getRepository(Client).findOne({ where: { id: dossier.clientId } }),
    db.getRepository(Site).findOne({ where: { id: dossier.siteId } }),
    db.getRepository(Product).find({ where: { dossierId, status: 1 }, order: { id: "ASC" } }),
    db.getRepository(ProductType).find(),
  ]);
  if (!client || !site) throw new Error("Cliente o sede no encontrados.");
  const ids = (f: (p: (typeof products)[number]) => number | null) => [...new Set(products.map(f).filter((x): x is number => x != null))];
  const [brands, manufacturers, countries] = await Promise.all([
    db.getRepository(Brand).find({ where: { id: In(ids((p) => p.brandId)) } }),
    db.getRepository(Manufacturer).find({ where: { id: In(ids((p) => p.manufacturerId)) } }),
    db.getRepository(OriginCountry).find({ where: { id: In(ids((p) => p.originCountryId)) } }),
  ]);
  const [sedapalLogo, items] = await Promise.all([
    loadLogo(),
    Promise.all(
      products.map(async (p, index): Promise<Gcfo0182ProductData> => {
        const withinLimit = index < MAX_EMBEDDED_PHOTOS;
        return {
          submittedCode: p.code,
          description: p.description,
          productTypeName: types.find((t) => t.id === p.productTypeId)?.name ?? null,
          model: null, // internal products have no "model" field
          brandNameSubmitted: brands.find((b) => b.id === p.brandId)?.name ?? null,
          manufacturerNameSubmitted: manufacturers.find((m) => m.id === p.manufacturerId)?.name ?? null,
          originCountryNameSubmitted: countries.find((c) => c.id === p.originCountryId)?.name ?? null,
          use: p.usage,
          warrantyYears: p.warrantyYears,
          photoBuffer: withinLimit ? await loadPhoto(p.photoPath) : null,
          photoSkippedDueToLimit: !withinLimit && !!p.photoPath,
          hasDatasheet: !!p.techSheetPath,
        };
      }),
    ),
  ]);
  return {
    submissionCode: dossier.code,
    generatedAt: new Date(),
    client: { businessName: client.businessName, taxId: client.ruc },
    location: { label: site.label, address: site.address },
    generalInfo: {
      registryFileNumber: dossier.registryNumber,
      address: dossier.address,
      district: dossier.district,
      province: dossier.province,
      department: dossier.department,
      legalRepresentativeName: dossier.legalRepresentative,
      companyPhone: dossier.companyPhone,
      companyEmail: dossier.companyEmail,
      contactName: dossier.contactName,
      contactPhone: dossier.contactPhone,
      contactEmail: dossier.contactEmail,
      observations: dossier.generalNotes,
      termsAcceptedAt: null,
    },
    products: items,
    sedapalLogo,
    showTermsAcceptance: false,
  };
}
