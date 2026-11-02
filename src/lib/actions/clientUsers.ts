"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { insertReturningId, isUniqueViolation } from "@/lib/db-helpers";
import { attempt } from "@/lib/result";
import { todayIso } from "@/lib/dates";
import { Client } from "@/entities/Client";
import { ClientUser } from "@/entities/ClientUser";
import { createAudit, updateAudit } from "@/entities/_audit";
import { requireAdmin, text, validId, validStatus } from "./_guards";
import { checkEmail, generateTempPassword } from "./passwords";

export type ClientUserRole = "CLIENT_USER" | "CLIENT_ADMIN";
export type ClientUserListItem = {
  id: number;
  name: string;
  email: string;
  role: ClientUserRole;
  active: boolean;
  hasPassword: boolean; // the hash itself never leaves the server
  mustChangePassword: boolean;
  emailVerified: boolean;
};

function checkRole(role: string): ClientUserRole {
  if (role !== "CLIENT_USER" && role !== "CLIENT_ADMIN") throw new Error("Rol inválido.");
  return role;
}

/** Portal users of one client. Admin only. */
export async function getClientUsersByClient(clientId: number): Promise<ClientUserListItem[]> {
  await requireAdmin();
  const db = await getDb();
  const rows = await db.getRepository(ClientUser).find({ where: { clientId: validId(clientId, "Cliente") }, order: { id: "ASC" } });
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === "CLIENT_ADMIN" ? "CLIENT_ADMIN" : "CLIENT_USER",
    active: u.status === 1,
    hasPassword: !!u.passwordHash,
    mustChangePassword: u.mustChangePassword === 1,
    emailVerified: !!u.emailVerifiedAt,
  }));
}

/**
 * Creates a portal user. With generatePassword the app makes a temporary password and returns it ONCE
 * (the admin copies it and hands it over; the person must change it at first login). Without it the account is
 * Google-only: the person "claims" it by signing in with exactly this email.
 */
export async function createClientUser(input: { clientId: number; name: string; email: string; role: string; generatePassword?: boolean }) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    const client = await db.getRepository(Client).findOne({ where: { id: validId(input.clientId, "Cliente") } });
    if (!client || client.status !== 1) throw new Error("Cliente no encontrado o inactivo.");
    const email = checkEmail(input.email);
    const temporaryPassword = input.generatePassword ? generateTempPassword() : null;
    const passwordHash = temporaryPassword ? await bcrypt.hash(temporaryPassword, 10) : null;
    try {
      const id = await insertReturningId(db.manager, ClientUser, {
        clientId: client.id,
        name: text(input.name, "El nombre", 200, true),
        email,
        passwordHash,
        role: checkRole(input.role),
        mustChangePassword: temporaryPassword ? 1 : 0,
        // Generating a password is the admin vouching for the address.
        emailVerifiedAt: temporaryPassword ? todayIso() : null,
        ...createAudit(s.audit),
      });
      revalidatePath("/clients");
      return { id, temporaryPassword };
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un usuario de portal con ese correo.");
      throw err;
    }
  });
}

export async function updateClientUser(input: { id: number; name?: string; role?: string }) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = text(input.name, "El nombre", 200, true);
    if (input.role !== undefined) data.role = checkRole(input.role);
    await db.getRepository(ClientUser).update({ id: validId(input.id) }, { ...data, ...updateAudit(s.audit) });
    revalidatePath("/clients");
  });
}

/** Logical delete / reactivate (NESTADO 2 / 1): a user with submissions can never be removed. */
export async function setClientUserStatus(id: number, status: number) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    await db.getRepository(ClientUser).update({ id: validId(id) }, { status: validStatus(status), ...updateAudit(s.audit) });
    revalidatePath("/clients");
  });
}

/** New temporary password (first one, or a reset). Returned once; the person must change it at next login. */
export async function generateClientUserPassword(id: number) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    const temporaryPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const r = await db.getRepository(ClientUser).update(
      { id: validId(id) },
      { passwordHash, mustChangePassword: 1, emailVerifiedAt: todayIso(), ...updateAudit(s.audit) },
    );
    if (!r.affected) throw new Error("Usuario no encontrado.");
    revalidatePath("/clients");
    return { temporaryPassword };
  });
}

export async function setClientUserEmailVerified(id: number, verified: boolean) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    await db.getRepository(ClientUser).update({ id: validId(id) }, { emailVerifiedAt: verified ? todayIso() : null, ...updateAudit(s.audit) });
    revalidatePath("/clients");
  });
}
