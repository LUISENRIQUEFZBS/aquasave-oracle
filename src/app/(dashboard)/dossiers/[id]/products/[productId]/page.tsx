import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getProductForEvaluation } from "@/lib/actions/evaluations";
import EvaluationsSection from "@/components/evaluations/EvaluationsSection";
import { fileUrl } from "@/lib/file-url";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = await params;
  const dossierId = Number(id);
  const pid = Number(productId);
  if (!Number.isSafeInteger(dossierId) || dossierId <= 0 || !Number.isSafeInteger(pid) || pid <= 0) notFound();
  const [data, session] = await Promise.all([getProductForEvaluation(pid), auth()]);
  if (!data || data.dossier.id !== dossierId) notFound();
  const { product } = data;
  const photo = fileUrl(product.photoPath);

  return (
    <div className="space-y-6">
      <Link href={`/dossiers/${dossierId}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-text-muted hover:text-text sm:min-h-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {data.dossier.code}
      </Link>
      <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Foto de referencia del producto" className="h-20 w-20 flex-shrink-0 rounded-md border border-border bg-bg object-contain" />
          ) : (
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md border border-dashed border-border text-xs text-text-muted">Sin foto</div>
          )}
          <div>
            <h1 className="font-mono text-xl font-semibold text-text">{product.code}</h1>
            <p className="mt-1 text-sm text-text-muted">{product.description}</p>
            <p className="mt-2 text-sm"><span className="text-text-muted">Tipo: </span><span className="text-text">{product.typeName}</span></p>
            <p className="text-sm"><span className="text-text-muted">Cliente: </span><span className="text-text">{data.clientName}</span></p>
          </div>
        </div>
      </div>
      <EvaluationsSection data={data} evaluatorName={session?.user?.name || session?.user?.email || "Usuario"} />
    </div>
  );
}
