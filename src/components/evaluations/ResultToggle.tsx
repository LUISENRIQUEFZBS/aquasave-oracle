"use client";

export default function ResultToggle({
  value,
  suggested,
  onChange,
}: {
  value: "CONFORME" | "NO_CONFORME" | null;
  suggested: "CONFORME" | "NO_CONFORME" | null;
  onChange: (v: "CONFORME" | "NO_CONFORME") => void;
}) {
  const isConforme = value === "CONFORME";
  const isOverridden = value !== null && suggested !== null && value !== suggested;

  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium text-text">
          {value === null ? "Pendiente" : isConforme ? "Conforme" : "No conforme"}
        </p>
        <p className="text-xs text-text-muted">
          {suggested === null
            ? "Completa las mediciones para calcular el resultado"
            : isOverridden
              ? "Anulado manualmente"
              : "Según el puntaje"}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isConforme}
        aria-label="Conforme / No conforme"
        onClick={() => onChange(isConforme ? "NO_CONFORME" : "CONFORME")}
        disabled={value === null}
        className={`relative h-7 w-12 flex-shrink-0 rounded-full border-0 p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          isConforme ? "bg-success" : "bg-danger"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            isConforme ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}