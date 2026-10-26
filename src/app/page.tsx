import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { UserMenu } from "@/components/ui/UserMenu";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  RECEPTIONIST: "Recepcionista",
};

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.userType === "internal";

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <span className="font-semibold">Aquasave</span>
        <UserMenu
          name={session.user.name || session.user.email || ""}
          email={session.user.email || ""}
          roleLabel={
            isAdmin
              ? ROLE_LABELS[session.user.role ?? ""] || session.user.role || ""
              : "Cliente"
          }
          image={session.user.image}
          onSignOut={handleSignOut}
        />
      </header>
      <main className="p-6">
        <h1 className="text-2xl font-semibold">
          {isAdmin ? "Bienvenido Admin" : "Bienvenido Cliente"}
        </h1>
      </main>
    </div>
  );
}