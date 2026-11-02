// File storage helper (server only). LOCAL folder for now; when IT assigns the file
// server, only FILES_BASE_DIR changes — the DB stores RELATIVE paths only
// (e.g. "2026/AQUA_CERTIFICADOS/000001-2026.pdf"). See CLAUDE.md, "File folder layout".
import path from "path";
import { mkdir, writeFile, readFile } from "fs/promises";
import { getDb } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-helpers";

/** Group code (VCODTIPO in AQUA_SECUENCIAL) -> subfolder. PROPOSED codes, pending IT confirmation. */
export const FILE_GROUPS = {
  EXPDOC: "EXPEDIENTES",
  DOCGEN: "DOCUMENTOS_GENERADOS",
  CERT: "CERTIFICADOS",
  PRODFOTO: "PRODUCTOS_FOTOS",
  PRODFICHA: "PRODUCTOS_FICHAS",
  EVALFOTO: "EVALUACIONES_FOTOS",
  SOLDOC: "SOLICITUDES",
  SOLFOTO: "SOLICITUDES_FOTOS",
  SOLFICHA: "SOLICITUDES_FICHAS",
} as const;
export type FileGroup = keyof typeof FILE_GROUPS;

/**
 * Prefix for the group subfolders, so AquaSave's folders are recognisable on a file server shared
 * with other systems (e.g. "2026/AQUA_CERTIFICADOS"). ASSUMED — confirm the real convention with Eli
 * BEFORE storing real files: the stored relative path includes it. Override with FILES_FOLDER_PREFIX.
 */
function folderPrefix(): string {
  const p = process.env.FILES_FOLDER_PREFIX ?? "AQUA_";
  if (!/^[A-Za-z0-9_]*$/.test(p)) throw new Error("FILES_FOLDER_PREFIX inválido.");
  return p;
}

/** Base folder. Keep it OUTSIDE public/. Set FILES_BASE_DIR in .env (default ./storage). */
export function getFilesBaseDir(): string {
  return path.resolve(process.env.FILES_BASE_DIR ?? path.join(process.cwd(), "storage"));
}

/** NORIGEN: AquaSave's origin code in AQUA_SECUENCIAL. PENDING from IT — 0 until then. */
function getOrigen(): number {
  const n = Number(process.env.FILES_ORIGEN ?? 0);
  if (!Number.isInteger(n) || n < 0 || n > 999) throw new Error("FILES_ORIGEN inválido (0-999).");
  return n;
}

/**
 * Reserves the next number for (origin, year, type code — a FileGroup, or e.g. \"EPA\" for expediente codes) by inserting a row in AQUA_SECUENCIAL.
 * Assumes ONE ROW PER ISSUED NUMBER (to confirm with Eli). The composite PK makes concurrent
 * callers collide (ORA-00001), so we simply retry with a fresh MAX+1.
 */
export async function nextSequential(group: string, createdBy: string, year = new Date().getFullYear()): Promise<number> {
  const db = await getDb();
  const origen = getOrigen();
  for (let attempt = 0; attempt < 8; attempt++) {
    const rows = await db.query(
      "SELECT NVL(MAX(NCORRELATIVO), 0) + 1 AS NEXTN FROM AQUA_SECUENCIAL WHERE NORIGEN = :1 AND NANO = :2 AND VCODTIPO = :3",
      [origen, year, group],
    );
    const next = Number(rows[0].NEXTN ?? rows[0].nextn);
    try {
      await db.query(
        "INSERT INTO AQUA_SECUENCIAL (NCORRELATIVO, VDESCRIPCION, DFECCRE, VRESCRE, NORIGEN, NANO, NESTADO, VCODTIPO) VALUES (:1, :2, SYSDATE, :3, :4, :5, 1, :6)",
        [next, `AquaSave ${group}`, createdBy.slice(0, 20), origen, year, group],
      );
      return next;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new Error("No se pudo reservar el número de archivo. Intente nuevamente.");
}

/** Saves a file and returns the RELATIVE path to store in the DB column (filePath/pdfPath/photoPath...). */
export async function saveFile(opts: { group: FileGroup; data: Buffer; ext: string; createdBy: string }): Promise<string> {
  const ext = opts.ext.toLowerCase().replace(/^\./, "");
  if (!/^[a-z0-9]{1,5}$/.test(ext)) throw new Error("Extensión de archivo inválida.");
  const year = new Date().getFullYear();
  const n = await nextSequential(opts.group, opts.createdBy, year);
  const rel = `${year}/${folderPrefix()}${FILE_GROUPS[opts.group]}/${String(n).padStart(6, "0")}-${year}.${ext}`;
  const abs = resolveSafe(rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, opts.data, { flag: "wx" }); // "wx": never overwrite an existing file
  return rel;
}

/** Reads a stored file by its relative path. Throws if the path tries to leave the base folder. */
export async function readStoredFile(rel: string): Promise<Buffer> {
  return readFile(resolveSafe(rel));
}

function resolveSafe(rel: string): string {
  const base = getFilesBaseDir();
  const abs = path.resolve(base, rel);
  if (abs !== base && !abs.startsWith(base + path.sep)) throw new Error("Ruta de archivo inválida.");
  return abs;
}
