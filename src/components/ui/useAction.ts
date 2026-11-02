"use client";
import { useState, useTransition } from "react";
import type { Result } from "@/lib/result";

/** Runs a server action, tracks pending state and shows the returned error message. */
export function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run<T>(fn: () => Promise<Result<T>>, onOk?: () => void) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
      else onOk?.();
    });
  }
  return { pending, error, run, clearError: () => setError(null) };
}
