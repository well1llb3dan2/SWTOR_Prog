import { SwtorDatabase } from "@swtor/db";
import { MemoryAccountStore, MongoAccountStore, type AccountStore } from "./accountStore.js";
import {
  MemoryOperationStore,
  MongoOperationStore,
  type OperationStore,
} from "./operationStore.js";
import { loadConfig } from "./config.js";
import { auditProductionSafety, describeProblems } from "./safety.js";
import { buildServer } from "./server.js";
import { MemoryReportStore, MongoReportStore, type ReportStore } from "./store.js";

const config = loadConfig();

const problems = auditProductionSafety(config);
if (problems.length > 0) {
  console.error(describeProblems(problems));
  process.exit(1);
}

let store: ReportStore;
let accounts: AccountStore;
let operations: OperationStore;

if (config.mongoUri === null) {
  store = new MemoryReportStore();
  accounts = new MemoryAccountStore();
  operations = new MemoryOperationStore();
} else {
  const db = await SwtorDatabase.connect({
    uri: config.mongoUri,
    dbName: config.mongoDb,
    retentionDays: config.retentionDays,
  });
  store = new MongoReportStore(db);
  accounts = new MongoAccountStore(db);
  operations = new MongoOperationStore(db);
}

const server = await buildServer({ config, store, accounts, operations });

if (config.mongoUri === null) {
  server.app.log.warn("MONGODB_URI not set; reports are kept in memory and lost on restart");
}

await server.app.listen({ port: config.port, host: config.host });

const SHUTDOWN_GRACE_MS = 15_000;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.app.log.info({ signal }, "shutting down");

    // A live raid holds open sockets; if draining stalls, exit anyway so the
    // platform's own kill timer does not take the process down mid-write.
    const forced = setTimeout(() => {
      server.app.log.warn("shutdown timed out; exiting");
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    forced.unref();

    void server
      .close()
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        server.app.log.error({ err: error }, "shutdown failed");
        process.exit(1);
      });
  });
}
