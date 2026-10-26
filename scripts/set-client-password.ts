import "dotenv/config";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { ClientUser } from "@/entities/ClientUser";

async function run() {
  const db = await getDb();
  const passwordHash = await bcrypt.hash("Test1234!", 10);
  const result = await db
    .getRepository(ClientUser)
    .update({ email: "cliente.prueba@ejemplo.com" }, { passwordHash, updatedBy: "sistema" });
  console.log("Filas actualizadas:", result.affected);
  await db.destroy();
}

run().catch((err) => {
  console.error("Falló:", err);
  process.exit(1);
});