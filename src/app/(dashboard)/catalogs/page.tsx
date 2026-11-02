import { auth } from "@/auth";
import { listCatalog, listProductTypes } from "@/lib/actions/catalogs";
import { CatalogsManager } from "./CatalogsManager";

export default async function CatalogsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const [brands, manufacturers, countries, types] = await Promise.all([
    listCatalog("brand", true),
    listCatalog("manufacturer", true),
    listCatalog("country", true),
    listProductTypes(true),
  ]);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Catálogos</h1>
      {!isAdmin && <p className="mb-4 text-sm opacity-60">Solo lectura: se requiere rol Administrador para modificar.</p>}
      <CatalogsManager
        isAdmin={isAdmin}
        brands={brands}
        manufacturers={manufacturers}
        countries={countries}
        types={types}
      />
    </div>
  );
}
