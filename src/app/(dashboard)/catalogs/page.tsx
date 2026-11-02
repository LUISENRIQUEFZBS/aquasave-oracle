import { auth } from "@/auth";
import { listCatalog, getCatalogUsage } from "@/lib/actions/catalogs";
import CatalogsPage from "@/components/catalogs/CatalogsPage";

export default async function Catalogs() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const [brands, manufacturers, countries, usage] = await Promise.all([
    listCatalog("brand", true),
    listCatalog("manufacturer", true),
    listCatalog("country", true),
    getCatalogUsage(),
  ]);
  return <CatalogsPage isAdmin={isAdmin} brands={brands} manufacturers={manufacturers} countries={countries} usage={usage} />;
}
