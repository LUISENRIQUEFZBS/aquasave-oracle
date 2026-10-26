import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { UserMenu } from "@/components/ui/UserMenu";

export default async function GatedPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "client") redirect("/login");

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <span className="font-semibold">Aquasave — Portal de clientes</span>
        <UserMenu
          name={session.user.name || session.user.email || ""}
          email={session.user.email || ""}
          roleLabel="Cliente"
          image={session.user.image}
          onSignOut={handleSignOut}
        />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}