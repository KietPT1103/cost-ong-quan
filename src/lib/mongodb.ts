import { MongoClient, Db } from "mongodb";

type CachedMongo = {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<MongoClient> | null;
  indexesEnsured?: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __mongoCached: CachedMongo | undefined;
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "cost_calculator";

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable.");
}

const cached: CachedMongo = global.__mongoCached ?? {
  client: null,
  db: null,
  promise: null,
  indexesEnsured: false,
};

if (!global.__mongoCached) {
  global.__mongoCached = cached;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (cached.client) return cached.client;

  if (!cached.promise) {
    const client = new MongoClient(uri);
    cached.promise = client.connect();
  }

  cached.client = await cached.promise;
  return cached.client;
}

export async function getDb(): Promise<Db> {
  if (cached.db) return cached.db;
  const client = await getMongoClient();
  cached.db = client.db(dbName);
  if (!cached.indexesEnsured) {
    cached.indexesEnsured = true;
    await ensureIndexes(cached.db);
  }
  return cached.db;
}

export { dbName };

async function ensureIndexes(db: Db) {
  const users = db.collection("users");

  await Promise.allSettled([
    db
      .collection("products")
      .createIndex({ storeId: 1, product_code: 1 }, { unique: true }),
    db.collection("products").createIndex({ storeId: 1, updatedAt: -1 }),
    db.collection("categories").createIndex({ storeId: 1, name: 1 }),
    db.collection("tables").createIndex({ storeId: 1, name: 1 }),
    db.collection("bills").createIndex({ storeId: 1, createdAt: -1 }),
    db.collection("employees").createIndex({ storeId: 1, name: 1 }),
    db.collection("payrolls").createIndex({ storeId: 1, createdAt: -1 }),
    db.collection("payroll_entries").createIndex({ payrollId: 1 }),
    db.collection("reports").createIndex({ storeId: 1, createdAt: -1 }),
    users.dropIndex("uid_1").catch(() => undefined),
    users.createIndex(
      { emailLower: 1 },
      {
        unique: true,
        partialFilterExpression: { emailLower: { $exists: true, $type: "string" } },
      }
    ),
    users.createIndex(
      { uid: 1 },
      {
        unique: true,
        partialFilterExpression: { uid: { $exists: true, $type: "string" } },
      }
    ),
  ]);
}
