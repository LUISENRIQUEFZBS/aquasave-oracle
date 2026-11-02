import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Explicitly require an internal session. Client sessions are valid only under /portal.
  if (session.user.userType !== "internal") redirect("/portal");
  return <DashboardShell user={{ ...session.user, role: session.user.role ?? "" }}>{children}</DashboardShell>;
}
