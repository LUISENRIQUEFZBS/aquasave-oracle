import { getClientsWithSites } from "@/lib/actions/clients";
import ClientsTable from "@/components/clients/ClientsTable";

export default async function ClientsPage() {
  const clients = await getClientsWithSites(true);
  return <ClientsTable clients={clients} />;
}
