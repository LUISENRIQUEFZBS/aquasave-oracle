import "dotenv/config";
import "reflect-metadata";
import oracledb from "oracledb";
oracledb.initOracleClient({
  libDir: process.env.ORACLE_INSTANT_CLIENT_LIB_DIR ?? "/opt/oracle/instantclient_23_26",
});

import * as entities from "../src/lib/auth-adapter-entities";

async function run() {
  const { TypeORMAdapter } = await import("@auth/typeorm-adapter");

  const adapter = TypeORMAdapter(
    {
      type: "oracle",
      host: process.env.ORACLE_HOST,
      port: Number(process.env.ORACLE_PORT),
      serviceName: process.env.ORACLE_SERVICE_NAME,
      username: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      synchronize: false,
    },
    { entities }
  );

  const user = await adapter.createUser!({
    id: crypto.randomUUID(),
    name: "Adapter Test User",
    email: "adapter-test@sedapal.com.pe",
    emailVerified: null,
  });
  console.log("Adapter createUser succeeded:", user);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Adapter test failed:", err);
    process.exit(1);
  });