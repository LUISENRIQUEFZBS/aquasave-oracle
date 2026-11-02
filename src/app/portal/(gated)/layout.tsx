import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { ClientUser } from "@/entities/ClientUser";

// Wraps every page under /portal EXCEPT /portal/security (a sibling outside this route group; a check in the
// parent layout would loop). NCAMBIO_PASS_OBLIG is read fresh from the DB, not from the JWT: tokens are not
// re-issued on every request, so a stale "must change" would otherwise keep redirecting after the change.
export default async function PortalGatedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const db = await getDb();
  const me = await db.getRepository(ClientUser).findOne({ where: { id: Number(session?.user?.id) } });
  if (me?.mustChangePassword === 1) redirect("/portal/security");
  return <>{children}</>;
}
