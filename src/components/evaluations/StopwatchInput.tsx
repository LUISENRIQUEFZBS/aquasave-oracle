"use client";
import { useEffect, useRef, useState } from "react";
export default function StopwatchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (seconds: string) => void;
}) {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(() => (parseFloat(value) || 0) * 1000);
  const [manualEdit, setManualEdit] = useState(true);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!running) return;
    startRef.current = performance.now() - elapsedMs;
    const tick = () => {
      setElapsedMs(performance.now() - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const stop = () => {
    setRunning(false);
    onChange((elapsedMs / 1000).toFixed(3));
  };
  const reset = () => {
    setRunning(false);
    setElapsedMs(0);
    onChange("");
  };
  const totalSeconds = elapsedMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor(elapsedMs % 1000);
  if (manualEdit) {
    return (
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Tiempo (s)
        </label>
        <div className="flex items-center gap-2">
          {/* flex-1 + min-w-0 is the actual fix — without it, w-full alone
              doesn't grow inside a flex row, so this input was quietly
              being squeezed down by the button next to it instead of
              filling the space, breaking alignment with the Presión
              input beside it in the parent grid. Same refined treatment
              (padding/radius/font/focus ring) as AddPruebaForm's other
              inputs for real visual coherence, not just a fix. */}
          <input
            type="number"
            step="0.001"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) onChange(n.toFixed(3));
            }}
            placeholder="0.000"
            className="no-spinner min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 py-2 font-mono text-base text-text shadow-sm transition-colors placeholder:font-sans placeholder:text-sm placeholder:text-text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
          <button
            type="button"
            onClick={() => {
              // Sync the stopwatch display/base to whatever was typed manually,
              // so switching views doesn't lose it, and pressing play continues
              // counting up from this value instead of resetting to 0.
              setElapsedMs((parseFloat(value) || 0) * 1000);
              setManualEdit(false);
            }}
            className="flex-shrink-0 whitespace-nowrap text-xs font-medium text-primary hover:underline"
          >
            Usar cronómetro
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        Tiempo (s)
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-sidebar px-2.5 py-2 shadow-sm">
        <span className="flex-1 text-center font-mono text-base font-semibold tabular-nums text-white">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          <span className="text-xs text-white/50">.{String(millis).padStart(3, "0")}</span>
        </span>
        {!running ? (
          <button
            type="button"
            onClick={() => setRunning(true)}
            aria-label="Iniciar"
            className="rounded-md bg-success px-2.5 py-1.5 text-sm text-white"
          >
            ▶
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            aria-label="Detener"
            className="rounded-md bg-danger px-2.5 py-1.5 text-sm text-white"
          >
            ■
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          aria-label="Reiniciar"
          className="rounded-md bg-white/10 px-2.5 py-1.5 text-sm text-white hover:bg-white/20"
        >
          ↺
        </button>
        <button
          type="button"
          onClick={() => setManualEdit(true)}
          className="flex-shrink-0 whitespace-nowrap text-xs text-white/60 hover:text-white"
        >
          Manual
        </button>
      </div>
    </div>
  );
}