"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEvaluationPhoto } from "@/lib/actions/evaluations";
import { useAction } from "@/components/ui/useAction";
import { fileUrl } from "@/lib/file-url";
import { errorText } from "@/components/ui/styles";
import PhotoCapture from "./PhotoCapture";

export default function EvaluationPhotoEditor({ evaluationId, photoPath, locked }: { evaluationId: number; photoPath: string | null; locked: boolean }) {
  const router = useRouter();
  const { pending, error, run, clearError } = useAction();
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  function save() {
    const fd = new FormData();
    if (photo) fd.set("photo", photo);
    else fd.set("remove", "1");
    run(() => updateEvaluationPhoto(evaluationId, fd), () => {
      setEditing(false);
      setPhoto(null);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="w-full max-w-xs space-y-2">
        <PhotoCapture file={photo} onChange={setPhoto} />
        {!photo && photoPath && <p className="text-xs text-text-muted">Sin foto nueva, al guardar se quitará la foto actual.</p>}
        {error && <p className={errorText}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={pending} className="min-h-11 rounded-md bg-primary px-3 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-50 sm:min-h-0 sm:py-1.5">
            {pending ? "Guardando..." : "Guardar"}
          </button>
          <button onClick={() => { setEditing(false); setPhoto(null); clearError(); }} className="min-h-11 rounded-md px-3 text-xs font-medium text-text-muted hover:bg-bg sm:min-h-0">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const url = fileUrl(photoPath);
  return (
    <div className="relative">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Foto de la evaluación" className="h-20 w-20 rounded-md border border-border bg-bg object-contain" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border text-xs text-text-muted">Sin foto</div>
      )}
      {!locked && (
        <button onClick={() => setEditing(true)} aria-label="Editar foto" className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow hover:bg-primary-dark">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
