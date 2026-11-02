// Not a "use server" file: plain helpers imported by the server actions.
import { auth } from "@/auth";

export type InternalSession = {
  userType: "internal";
  userId: number;
  role: string;
  audit: string; // value for VRESCRE / VRESACT (max 20 chars)
};

/** Any logged-in internal (staff) user. */
export async function requireInternal(): Promise<InternalSession> {
  const session = await auth();
  const u = session?.user;
  if (!u || u.userType !== "internal") throw new Error("No autenticado.");
  const userId = Number(u.id);
  // "I:12" = internal user 12. Short, unambiguous, fits VARCHAR2(20). Pending ETIC (see CLAUDE.md).
  return { userType: "internal", userId, role: u.role ?? "", audit: `I:${userId}` };
}

/** Internal user with role ADMIN. */
export async function requireAdmin(): Promise<InternalSession> {
  const s = await requireInternal();
  if (s.role !== "ADMIN") throw new Error("No autorizado: se requiere rol ADMIN.");
  return s;
}

export type ClientSession = {
  userType: "client";
  clientUserId: number;
  clientId: number;
  clientRole: string;
  audit: string;
};

/** Logged-in client-portal user. Always filter data by session.clientId on the server. */
export async function requireClientUser(): Promise<ClientSession> {
  const session = await auth();
  const u = session?.user;
  if (!u || u.userType !== "client" || u.clientId == null) throw new Error("No autenticado.");
  const clientUserId = Number(u.id);
  return { userType: "client", clientUserId, clientId: u.clientId, clientRole: u.clientRole ?? "", audit: `C:${clientUserId}` };
}

/** Trim + validate a text field. Returns null for empty optional values. */
export function text(value: string | undefined | null, label: string, max: number, required: true): string;
export function text(value: string | undefined | null, label: string, max: number, required?: false): string | null;
export function text(value: string | undefined | null, label: string, max: number, required = false): string | null {
  const v = (value ?? "").trim();
  if (!v) {
    if (required) throw new Error(`${label} es obligatorio.`);
    return null;
  }
  if (v.length > max) throw new Error(`${label} no puede superar ${max} caracteres.`);
  return v;
}

export function validId(id: number, label = "ID"): number {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} inválido.`);
  return id;
}

export function validStatus(status: number): 1 | 2 {
  if (status !== 1 && status !== 2) throw new Error("Estado inválido.");
  return status;
}
