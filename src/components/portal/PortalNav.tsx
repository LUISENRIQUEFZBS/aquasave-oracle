"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { UserMenu } from "@/components/ui/UserMenu";

// Add { href: "/portal/submissions", label: "Mis solicitudes" } when that screen is ported.
const NAV_ITEMS: { href: string; label: string }[] = [];

export default function PortalNav({
  businessName,
  name,
  email,
  clientRole,
  image,
}: {
  businessName: string;
  name: string;
  email: string;
  clientRole: string;
  image?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Company-wide settings only make sense for CLIENT_ADMIN — mirrors
  // how "Usuarios del portal" and every other company-wide action in
  // this app is already scoped. "Seguridad" (change password) is
  // personal, so every portal user gets it regardless of role.
  // Not built yet in this repo: "Datos de la empresa" (/portal/company) and
  // "Seguridad" (/portal/security). Re-enable them here when those pages exist.
  const menuItems: { label: string; href: string }[] = [];

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-8">
          <Link href="/portal" className="flex shrink-0 items-center gap-3">
            <Logo markSize={28} wordmarkSize="text-base" />
            {businessName && (
              <span className="hidden items-center gap-3 sm:flex">
                <span className="h-5 w-px bg-border" aria-hidden />
                <span className="max-w-[14rem] truncate text-sm font-medium text-text-muted">
                  {businessName}
                </span>
              </span>
            )}
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-text-muted hover:bg-bg hover:text-text"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0">
          <UserMenu
            name={name}
            email={email}
            roleLabel={clientRole === "CLIENT_ADMIN" ? "Administrador" : "Usuario"}
            image={image}
            menuItems={menuItems}
            onSignOut={async () => {
              // signOut({ callbackUrl: "/login" }) lets Auth.js compute
              // the redirect URL server-side, which lands on localhost
              // regardless of which host the person actually connected
              // through (even with AUTH_TRUST_HOST set) — same gotcha
              // already documented and fixed for the internal side's
              // UserAvatar.tsx. Doing the navigation with Next's own
              // router instead sidesteps server-side URL computation
              // entirely.
              await signOut({ redirect: false });
              router.push("/login");
            }}
          />
        </div>
      </div>
    </header>
  );
}