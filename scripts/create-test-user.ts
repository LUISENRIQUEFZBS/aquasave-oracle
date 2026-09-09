import "dotenv/config";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { User } from "@/entities/User";

async function run() {
  const db = await getDb();
  const repo = db.getRepository(User);

  const passwordHash = await bcrypt.hash("Test1234!", 10);

  const user = repo.create({
    name: "Admin de Prueba",
    email: "admin@sedapal.com.pe",
    passwordHash,
    role: "ADMIN",
    active: true,
    createdAt: new Date(),
    updatedAt: null,
  });

  await repo.save(user);
  console.log("Test user created: admin@sedapal.com.pe / Test1234!");

  await db.destroy();
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});