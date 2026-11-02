"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
// `built: false` entries are hidden until their screen exists in this repo (flip to true then).
// Tipos de producto are managed inside /catalogs for now.
const NAV_ITEMS = [
  { href: "/", label: "Expedientes", icon: FolderIcon, built: true },
  { href: "/reviews", label: "Revisión de solicitudes", icon: ClipboardCheckIcon, built: false },
  { href: "/clients", label: "Clientes", icon: UsersIcon, built: true },
  { href: "/dispatch", label: "Despacho", icon: TruckIcon, built: false },
  { href: "/instruments", label: "Instrumentos", icon: GaugeIcon, built: true },
];
const ADMIN_NAV_ITEMS = [
  { href: "/types", label: "Tipos de producto", icon: TagIcon, built: false },
  { href: "/catalogs", label: "Catálogos", icon: BookIcon, built: true },
  { href: "/users", label: "Usuarios", icon: UsersIcon, built: false },
];
export default function Sidebar({
  open,
  onClose,
  role,
}: {
  open: boolean;
  onClose: () => void;
  role: string;
}) {
  const pathname = usePathname();
  const items = (role === "ADMIN" ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS).filter((i) => i.built);
  // "/" (Expedientes) also covers the dossier detail pages under /dossiers.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/dossiers") : pathname === href || pathname.startsWith(href + "/");
  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-300 ease-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <Logo variant="dark" markSize={32} wordmarkSize="text-lg" />
        </div>
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 text-xs text-white/40">
          Laboratorio de certificación
        </div>
      </aside>
    </>
  );
}
function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ClipboardCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 14 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function GaugeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12 17 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2v2M22 12h-2M12 22v-2M4.9 4.9l1.4 1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M1 3h13v13H1zM14 8h4l3 3v5h-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5.5" cy="18" r="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.5" cy="18" r="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.34-4.35a2 2 0 0 0 .01-2.83Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}