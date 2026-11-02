"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: string; image?: string | null };
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={user} onOpenNav={() => setNavOpen(true)} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}