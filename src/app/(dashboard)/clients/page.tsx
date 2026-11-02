import { getClientsWithSites } from "@/lib/actions/clients";
import { ClientsManager } from "./ClientsManager";

export default async function ClientsPage() {
  const clients = await getClientsWithSites(true);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Clientes</h1>
      <ClientsManager clients={clients} />
    </div>
  );
}
