import { getDispatchQueue, getDispatchHistory } from "@/lib/actions/dispatch";
import DispatchPage from "@/components/dispatch/DispatchPage";

export default async function Dispatch() {
  const [pending, history] = await Promise.all([getDispatchQueue(), getDispatchHistory()]);
  return <DispatchPage pending={pending} history={history} />;
}
