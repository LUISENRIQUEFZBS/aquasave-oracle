import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { Client } from "@/entities/Client";
import PortalNav from "@/components/portal/PortalNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Real security boundary for the whole client portal (proxy.ts only checks "is there a session").
  if (!session?.user) redirect("/login");
  if (session.user.userType !== "client") redirect("/");

  // Shown next to the logo: with several users per client, the person's name alone
  // does not say which company they act for.
  const db = await getDb();
  const client = await db.getRepository(Client).findOne({ where: { id: session.user.clientId! } });

  return (
    <div className="min-h-screen bg-bg">
      <PortalNav
        businessName={client?.businessName ?? ""}
        name={session.user.name ?? ""}
        email={session.user.email ?? ""}
        clientRole={session.user.clientRole ?? "CLIENT_USER"}
        image={session.user.image}
      />
      {/* Each page under /portal owns its own container (mx-auto max-w-4xl px-4 py-8). */}
      <main>{children}</main>
    </div>
  );
}
