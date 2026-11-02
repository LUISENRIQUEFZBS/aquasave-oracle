"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { insertReturningId, isUniqueViolation } from "@/lib/db-helpers";
import { attempt } from "@/lib/result";
import { User } from "@/entities/User";
import { createAudit, updateAudit } from "@/entities/_audit";
import { requireAdmin, text, validId, validStatus } from "./_guards";
import { checkEmail, checkPassword } from "./passwords";

export type StaffRole = "ADMIN" | "RECEPTIONIST" | "EVALUATOR";
export type StaffListItem = { id: number; name: string; email: string; role: StaffRole; active: boolean; hasPassword: boolean };

function checkRole(role: string): StaffRole {
  if (role !== "ADMIN" && role !== "RECEPTIONIST" && role !== "EVALUATOR") throw new Error("Rol inválido.");
  return role;
}

/** Internal staff. Admin only (the password hash never leaves the server). */
export async function getUsers(): Promise<StaffListItem[]> {
  await requireAdmin();
  const db = await getDb();
  const rows = await db.getRepository(User).find({ order: { name: "ASC" } });
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: checkRole(u.role),
    active: u.status === 1,
    hasPassword: !!u.passwordHash,
  }));
}

/** password is optional: leave it empty for people who will only sign in with Google / Microsoft. */
export async function createUser(input: { name: string; email: string; role: string; password?: string }) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    const passwordHash = input.password ? await bcrypt.hash(checkPassword(input.password), 10) : null;
    try {
      const id = await insertReturningId(db.manager, User, {
        name: text(input.name, "El nombre", 200, true),
        email: checkEmail(input.email),
        passwordHash,
        role: checkRole(input.role),
        ...createAudit(s.audit),
      });
      revalidatePath("/users");
      return { id };
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un usuario con ese correo.");
      throw err;
    }
  });
}

export async function updateUser(input: { id: number; name: string; email: string; role: string }) {
  return attempt(async () => {
    const s = await requireAdmin();
    const id = validId(input.id, "Usuario");
    const role = checkRole(input.role);
    if (id === s.userId && role !== "ADMIN") throw new Error("No puedes quitarte a ti mismo el rol de administrador.");
    const db = await getDb();
    try {
      await db.getRepository(User).update({ id }, { name: text(input.name, "El nombre", 200, true), email: checkEmail(input.email), role, ...updateAudit(s.audit) });
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un usuario con ese correo.");
      throw err;
    }
    revalidatePath("/users");
  });
}

export async function resetUserPassword(input: { id: number; newPassword: string }) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    const passwordHash = await bcrypt.hash(checkPassword(input.newPassword, "La nueva contraseña"), 10);
    await db.getRepository(User).update({ id: validId(input.id, "Usuario") }, { passwordHash, ...updateAudit(s.audit) });
    revalidatePath("/users");
  });
}

export async function setUserStatus(id: number, status: number) {
  return attempt(async () => {
    const s = await requireAdmin();
    const uid = validId(id, "Usuario");
    const st = validStatus(status);
    if (uid === s.userId && st !== 1) throw new Error("No puedes desactivar tu propia cuenta.");
    const db = await getDb();
    await db.getRepository(User).update({ id: uid }, { status: st, ...updateAudit(s.audit) });
    revalidatePath("/users");
  });
}
