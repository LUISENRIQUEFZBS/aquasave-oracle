"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvaluationShell } from "@/lib/actions/evaluations";
import { useAction } from "@/components/ui/useAction";
import { formatLima, todayIso } from "@/lib/dates";
import { btnPrimary, errorText } from "@/components/ui/styles";
import PhotoCapture from "./PhotoCapture";

export default function NewEvaluationShellForm({ productId, dossierId, evaluatorName }: { productId: number; dossierId: number; evaluatorName: string }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [photo, setPhoto] = useState<File | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("productId", String(productId));
    if (photo) fd.set("photo", photo);
    run(
      async () => {
        const r = await createEvaluationShell(fd);
        if (r.ok) router.push(`/dossiers/${dossierId}/products/${productId}/evaluations/${r.data.id}`);
        return r;
      },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 rounded-md bg-bg p-3 text-sm">
        <div>
          <p className="text-xs text-text-muted">Fecha</p>
          <p className="text-text">{formatLima(todayIso(), { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Evaluador</p>
          <p className="text-text">{evaluatorName}</p>
        </div>
      </div>
      <PhotoCapture file={photo} onChange={setPhoto} />
      {error && <p className={errorText} role="alert">{error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "Creando..." : "Empezar evaluación"}
      </button>
    </form>
  );
}
