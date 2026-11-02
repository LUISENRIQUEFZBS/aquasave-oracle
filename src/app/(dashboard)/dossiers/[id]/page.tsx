import Link from "next/link";
import { notFound } from "next/navigation";
import { getDossierDetail } from "@/lib/actions/dossiers";
import { listCatalog, listProductTypes } from "@/lib/actions/catalogs";
import { DossierDetailView } from "./DossierDetailView";

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) notFound();
  const detail = await getDossierDetail(numericId);
  if (!detail) notFound();
  const [types, brands, manufacturers, countries] = await Promise.all([
    listProductTypes(false),
    listCatalog("brand"),
    listCatalog("manufacturer"),
    listCatalog("country"),
  ]);
  return (
    <div>
      <Link href="/" className="mb-3 inline-block py-2 text-sm text-primary hover:underline">← Expedientes</Link>
      <DossierDetailView detail={detail} types={types} brands={brands} manufacturers={manufacturers} countries={countries} />
    </div>
  );
}
