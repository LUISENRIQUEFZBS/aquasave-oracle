"use client";
import { toast } from "sonner";

/** Non-blocking replacement for window.confirm(): resolves true only if the user presses "Confirmar". */
export function confirmToast(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: boolean) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    toast(message, {
      duration: Infinity,
      action: { label: "Confirmar", onClick: () => done(true) },
      cancel: { label: "Cancelar", onClick: () => done(false) },
      onDismiss: () => done(false),
    });
  });
}
