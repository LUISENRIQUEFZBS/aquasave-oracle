// Plain helpers (no "use server"): passwords and email checks shared by the user actions.
import { randomInt } from "crypto";

// Excludes look-alike characters (0/O, 1/l/I): the password is read off a screen and typed by hand.
const PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  return out;
}

/** A password chosen by a person. bcrypt only looks at the first 72 bytes, so we cap it. */
export function checkPassword(pw: string, label = "La contraseña"): string {
  if (pw.length < 8) throw new Error(`${label} debe tener al menos 8 caracteres.`);
  if (pw.length > 72) throw new Error(`${label} no puede superar 72 caracteres.`);
  return pw;
}

/**
 * Email: lower-cased, plain ASCII only (the database is US7ASCII, so an accented address would be
 * stored with "?" and could never match the one Google/Microsoft returns).
 */
export function checkEmail(raw: string): string {
  const email = (raw ?? "").trim().toLowerCase();
  if (!email) throw new Error("El correo es obligatorio.");
  if (email.length > 200) throw new Error("El correo no puede superar 200 caracteres.");
  if (!/^[\x21-\x7e]+$/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Correo inválido (solo letras sin tildes, números y símbolos normales).");
  }
  return email;
}
