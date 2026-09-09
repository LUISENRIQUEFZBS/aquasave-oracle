import "reflect-metadata";
import oracledb from "oracledb";
oracledb.initOracleClient({ libDir: "/opt/oracle/instantclient_23_26" });

import { DataSource } from "typeorm";
import { EntitySchema } from "typeorm";

interface TestItem {
  id: number;
  name: string;
  createdAt: Date;
}

const TestItemSchema = new EntitySchema<TestItem>({
  name: "TestItem",
  tableName: "TEST_ITEMS",
  columns: {
    id: { primary: true, type: "number", name: "ID" },
    name: { type: "varchar2", length: 100, name: "NAME" },
    createdAt: { type: "timestamp", name: "CREATED_AT" },
  },
});

const AppDataSource = new DataSource({
  type: "oracle",
  host: "scandesa.sedapal.com.pe",
  port: 1521,
  serviceName: "SAPLIDES",
  username: "USE_MEDHA_CONEX",
  password: process.env.ORACLE_PASSWORD,
  entities: [TestItemSchema],
});

AppDataSource.initialize()
  .then(async (ds) => {
    const items = await ds.getRepository(TestItemSchema).find();
    console.log("TypeORM read success:", items);
    await ds.destroy();
  })
  .catch((err) => console.error("TypeORM failed:", err));
