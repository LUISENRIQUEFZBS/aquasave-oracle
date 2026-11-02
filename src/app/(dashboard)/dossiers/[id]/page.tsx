import Link from "next/link";
import { notFound } from "next/navigation";
import { getDossierDetail } from "@/lib/actions/dossiers";
import { listCatalog, listProductTypes } from "@/lib/actions/catalogs";
import { getDossierDocumentsOverview } from "@/lib/actions/dossierDocuments";
import { DossierDetailView } from "./DossierDetailView";

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) notFound();
  const detail = await getDossierDetail(numericId);
  if (!detail) notFound();
  const [types, brands, manufacturers, countries, documents] = await Promise.all([
    listProductTypes(false),
    listCatalog("brand"),
    listCatalog("manufacturer"),
    listCatalog("country"),
    getDossierDocumentsOverview(numericId),
  ]);
  return (
    <div>
      <Link href="/" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-text-muted hover:text-text sm:min-h-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Expedientes
      </Link>
      <DossierDetailView detail={detail} types={types} brands={brands} manufacturers={manufacturers} countries={countries} documents={documents} />
    </div>
  );
}
