import { auth } from "@/auth";
import { getUsers } from "@/lib/actions/users";
import UsersPage from "@/components/users/UsersPage";

export default async function Users() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center">
        <p className="text-text-muted">No tienes permisos para ver esta sección.</p>
        <p className="mt-1 text-sm text-text-muted">Solo los administradores pueden gestionar usuarios.</p>
      </div>
    );
  }
  const users = await getUsers();
  return <UsersPage users={users} currentUserId={Number(session.user.id)} />;
}
