import "reflect-metadata";
import oracledb from "oracledb";
oracledb.initOracleClient({ libDir: "/opt/oracle/instantclient_23_26" });

import { DataSource, EntitySchema } from "typeorm";

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
    const repo = ds.getRepository(TestItemSchema);

    // Manual ID since there's no sequence/trigger yet on this table
    const newItem = repo.create({ id: 1, name: "Desde TypeORM", createdAt: new Date() });
    await repo.save(newItem);
    console.log("Insert success");

    const items = await repo.find();
    console.log("All items:", items);

    await ds.destroy();
  })
  .catch((err) => console.error("TypeORM failed:", err));
