import { auth } from "@/auth";
import { getInstruments } from "@/lib/actions/instruments";
import InstrumentsPage from "@/components/instruments/InstrumentsPage";

export default async function Instruments() {
  const session = await auth();
  const instruments = await getInstruments();
  return <InstrumentsPage instruments={instruments} isAdmin={session?.user?.role === "ADMIN"} />;
}
