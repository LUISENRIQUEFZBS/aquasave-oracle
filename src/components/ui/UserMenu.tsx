"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";

export function UserMenu({
  name,
  email,
  roleLabel,
  image,
  menuItems,
  onSignOut,
}: {
  name: string;
  email: string;
  roleLabel: string;
  image?: string | null;
  // Optional extra links rendered between the identity header and the
  // sign-out divider — e.g. "Datos de la empresa" for the portal's
  // CLIENT_ADMIN. Kept generic (not portal-specific) so the internal
  // side's UserAvatar could reuse this component with its own items.
  menuItems?: { label: string; href: string }[];
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de usuario"
        className="rounded-full transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <Avatar name={name} image={image} size={32} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-border bg-surface p-1.5 shadow-lg"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-text">{name}</p>
            <p className="truncate text-xs text-text-muted">{email}</p>
            <p className="mt-0.5 text-xs text-text-muted">{roleLabel}</p>
          </div>

          {menuItems && menuItems.length > 0 && (
            <>
              <div className="my-1 h-px bg-border" />
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-md px-2.5 py-2 text-left text-sm text-text transition-colors hover:bg-bg"
                >
                  {item.label}
                </Link>
              ))}
            </>
          )}

          <div className="my-1 h-px bg-border" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/5"
          >
            <LogOutIcon />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

function LogOutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}