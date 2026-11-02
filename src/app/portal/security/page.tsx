import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { ClientUser } from "@/entities/ClientUser";
import ChangePasswordForm from "@/components/portal/ChangePasswordForm";

export default async function PortalSecurityPage() {
  const session = await auth();
  if (session?.user?.userType !== "client") redirect("/login");

  const db = await getDb();
  const me = await db.getRepository(ClientUser).findOne({ where: { id: Number(session.user.id) } });
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <ChangePasswordForm forced={me?.mustChangePassword === 1} hasPassword={!!me?.passwordHash} />
    </div>
  );
}
