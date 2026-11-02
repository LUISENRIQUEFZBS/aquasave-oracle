"use client";
import { useEffect, useRef, useState } from "react";

const MAX_ORIGINAL_SIZE = 20 * 1024 * 1024; // reject absurdly large files up front
const MAX_DIMENSION = 1280; // px — plenty for the certificate
const JPEG_QUALITY = 0.75;

async function resizeImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen."))), "image/jpeg", JPEG_QUALITY),
  );
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}

/**
 * Picks a photo (camera or gallery), shrinks it in the browser and hands the resulting File to the parent.
 * Nothing is uploaded here: the parent sends the File inside a FormData together with its server action.
 */
export default function PhotoCapture({
  file,
  onChange,
  label = "Foto del producto",
  helpText = "Esta foto se mostrará en el certificado. Se ajusta automáticamente para no ocupar demasiado espacio.",
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  helpText?: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleFile(f: File) {
    setError(null);
    if (f.size > MAX_ORIGINAL_SIZE) return setError("La imagen es demasiado grande (máx. 20 MB).");
    if (!f.type.startsWith("image/")) return setError("El archivo debe ser una imagen.");
    setBusy(true);
    try {
      onChange(await resizeImage(f));
    } catch {
      setError("No se pudo procesar la imagen. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const cameraIcon = (size: number) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text">{label}</label>
      <p className="text-xs text-text-muted">{helpText}</p>
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Foto" className="h-48 w-full rounded-md border border-border bg-bg object-contain" />
          <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 min-h-9 rounded-md bg-black/60 px-3 text-xs text-white hover:bg-black/80">
            Quitar
          </button>
        </div>
      ) : (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={busy}
            className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border text-text-muted hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {cameraIcon(28)}
            <span className="text-sm">{busy ? "Procesando..." : "Agregar foto"}</span>
          </button>
          {menuOpen && (
            <div className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
              <button type="button" onClick={() => { setMenuOpen(false); cameraRef.current?.click(); }} className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm text-text hover:bg-bg">
                {cameraIcon(18)} Tomar foto
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); galleryRef.current?.click(); }} className="flex min-h-11 w-full items-center gap-3 border-t border-border px-4 py-3 text-left text-sm text-text hover:bg-bg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m21 15-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Elegir de galería
              </button>
            </div>
          )}
        </div>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void handleFile(f); }} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void handleFile(f); }} />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
