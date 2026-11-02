import { auth } from "@/auth";
import { listProductTypes, getCatalogUsage } from "@/lib/actions/catalogs";
import ProductTypesTable from "@/components/product-types/ProductTypesTable";

export default async function ProductTypesPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const [types, usage] = await Promise.all([listProductTypes(true), getCatalogUsage()]);
  return <ProductTypesTable types={types} usage={usage.type} isAdmin={isAdmin} />;
}
