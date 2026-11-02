// Shared Tailwind class strings for the dashboard screens. Uses the theme tokens from globals.css
// (bg, surface, border, primary, primary-dark, text-muted, danger...). Mobile first: 16px inputs
// (prevents iOS zoom on focus) and 44px touch targets below the sm breakpoint.
export const input =
  "w-full min-h-11 sm:min-h-0 rounded border border-border bg-surface px-3 py-2 text-base sm:px-2 sm:py-1.5 sm:text-sm";
export const btn =
  "min-h-11 sm:min-h-0 rounded border border-border bg-surface px-3 py-2 text-sm hover:bg-bg disabled:opacity-50 sm:py-1.5";
export const btnPrimary =
  "min-h-11 sm:min-h-0 rounded bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 sm:py-1.5";
export const card = "rounded border border-border bg-surface p-3 sm:p-4";
export const muted = "text-sm text-text-muted";
export const errorText = "text-sm text-danger";
