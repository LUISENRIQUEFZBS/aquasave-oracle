// src/lib/db.ts
import "reflect-metadata";
import oracledb from "oracledb";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";
import { ClientUser } from "@/entities/ClientUser";
import { AuthAccount } from "@/entities/AuthAccount";
import { AuthVerificationToken } from "@/entities/AuthVerificationToken";

// Thick mode initialization — required for USE_MEDHA_CONEX's password verifier type.
// Must run once, before any DataSource is created. Guarded the same way as the
// DataSource itself, since Next.js dev hot-reload can otherwise call this twice
// and throw "Cannot initialize Oracle client because it is already initialized."
declare global {
  // eslint-disable-next-line no-var
  var __oracleClientInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __appDataSource: DataSource | undefined;
}

if (!global.__oracleClientInitialized) {
  oracledb.initOracleClient({
    libDir: process.env.ORACLE_INSTANT_CLIENT_LIB_DIR ?? "/opt/oracle/instantclient_23_26",
  });
  global.__oracleClientInitialized = true;
}

function buildDataSource(): DataSource {
  return new DataSource({
    type: "oracle",
    host: process.env.ORACLE_HOST ?? "scandesa.sedapal.com.pe",
    port: Number(process.env.ORACLE_PORT ?? 1521),
    serviceName: process.env.ORACLE_SERVICE_NAME ?? "SAPLIDES",
    username: process.env.ORACLE_USER ?? "USE_MEDHA_CONEX",
    password: process.env.ORACLE_PASSWORD,
    entities: [User, ClientUser, AuthAccount, AuthVerificationToken],
    synchronize: false, // NEVER true against this real, shared database — see CLAUDE.md's migration discipline
    logging: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const AppDataSource = global.__appDataSource ?? buildDataSource();

if (process.env.NODE_ENV !== "production") {
  global.__appDataSource = AppDataSource;
}

let initPromise: Promise<DataSource> | null = null;

/**
 * Ensures the shared DataSource is initialized exactly once.
 * Call this at the start of any server action / route handler that touches the DB,
 * same role as Prisma's implicit lazy-connect — TypeORM requires an explicit call.
 */
export async function getDb(): Promise<DataSource> {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }
  if (!initPromise) {
    initPromise = AppDataSource.initialize();
  }
  return initPromise;
}