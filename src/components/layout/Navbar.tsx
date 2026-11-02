"use client";
import UserAvatar from "./UserAvatar";
export default function Navbar({
  user,
  onOpenNav,
}: {
  user: { name?: string | null; email?: string | null; role: string; image?: string | null };
  onOpenNav: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-6">
      <button
        onClick={onOpenNav}
        aria-label="Abrir menú"
        className="rounded-md p-2 text-text-muted hover:bg-bg md:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>
      <div className="hidden md:block" />
      <UserAvatar user={user} />
    </header>
  );
}