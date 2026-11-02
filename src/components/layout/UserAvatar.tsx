"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  RECEPTIONIST: "Recepcionista",
  EVALUATOR: "Evaluador",
};
const ROLE_RING: Record<string, string> = {
  ADMIN: "ring-primary",
  RECEPTIONIST: "ring-warning",
  EVALUATOR: "ring-accent",
};
function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email || "";
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
export default function UserAvatar({
  user,
}: {
  user: { name?: string | null; email?: string | null; role: string; image?: string | null };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);
  const initials = getInitials(user.name, user.email);
  const ring = ROLE_RING[user.role] || "ring-border";
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-white ring-2 ring-offset-2 ring-offset-surface ${ring}`}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- can be
          // either an external Google-hosted URL or a local
          // /api/uploads/... path (Microsoft-fetched photo); next/image
          // would need every possible domain allowlisted, a plain <img>
          // is simpler for a small avatar with no layout-shift risk.
          <img
            src={user.image}
            alt={user.name || user.email || ""}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-border bg-surface py-2 shadow-lg">
          <div className="border-b border-border px-4 py-2">
            <p className="truncate text-sm font-medium text-text">
              {user.name || user.email}
            </p>
            <p className="text-xs text-text-muted">
              {ROLE_LABELS[user.role] || user.role}
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut({ redirect: false });
              router.push("/login");
              router.refresh();
            }}
            className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-bg"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}