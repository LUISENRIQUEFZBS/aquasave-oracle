"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { attempt } from "@/lib/result";
import { ClientUser } from "@/entities/ClientUser";
import { updateAudit } from "@/entities/_audit";
import { requireClientUser } from "./_guards";
import { checkPassword } from "./passwords";

/** The signed-in portal user changes THEIR OWN password (the id comes from the session, never from the browser). */
export async function changeOwnPassword(input: { currentPassword: string; newPassword: string }) {
  return attempt(async () => {
    const s = await requireClientUser();
    const newPassword = checkPassword(input.newPassword, "La nueva contraseña");
    if (input.currentPassword === newPassword) throw new Error("La nueva contraseña debe ser diferente a la actual.");
    const db = await getDb();
    const repo = db.getRepository(ClientUser);
    const me = await repo.findOne({ where: { id: s.clientUserId } });
    if (!me || me.status !== 1) throw new Error("Cuenta no disponible.");
    if (!me.passwordHash) throw new Error("Esta cuenta no tiene contraseña configurada. Contacta a un administrador.");
    if (!(await bcrypt.compare(input.currentPassword ?? "", me.passwordHash))) throw new Error("La contraseña actual no es correcta.");
    await repo.update({ id: me.id }, { passwordHash: await bcrypt.hash(newPassword, 10), mustChangePassword: 0, ...updateAudit(s.audit) });
    // The (gated) layout reads mustChangePassword fresh from the DB; this lifts the forced redirect.
    revalidatePath("/portal", "layout");
  });
}
