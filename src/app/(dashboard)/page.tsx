import { listDossiers } from "@/lib/actions/dossiers";
import { getClientsWithSites } from "@/lib/actions/clients";
import { DossiersManager } from "./dossiers/DossiersManager";

// Home of the internal area = the list of expedientes (same as the original app).
export default async function DashboardPage() {
  const [dossiers, clients] = await Promise.all([listDossiers(), getClientsWithSites(false)]);
  return <DossiersManager dossiers={dossiers} clients={clients} />;
}
