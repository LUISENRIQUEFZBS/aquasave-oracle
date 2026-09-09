import "dotenv/config";
import { getDb } from "../src/lib/db";
import { User } from "../src/entities/User";

async function run() {
  const db = await getDb();
  const repo = db.getRepository(User);

  const newUser = repo.create({
    name: "Prueba Usuario",
    email: "prueba@sedapal.com.pe",
    passwordHash: null,
    role: "ADMIN",
    active: true,
    createdAt: new Date(),
    updatedAt: null,
  });

  const saved = await repo.save(newUser);
  console.log("Insert success, generated ID:", saved.id);

  const allUsers = await repo.find();
  console.log("All users:", allUsers);

  await db.destroy();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});