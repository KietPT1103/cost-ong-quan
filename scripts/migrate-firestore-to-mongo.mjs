import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import admin from "firebase-admin";
import { MongoClient, ObjectId } from "mongodb";

const ROOT = process.cwd();

function loadEnvFile(fileName = ".env.local") {
  const envPath = path.join(ROOT, fileName);
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const {
  MONGODB_URI,
  MONGODB_DB = "cost_calculator",
  FIREBASE_SERVICE_ACCOUNT_JSON,
  MIGRATE_DEFAULT_STORE_ID = "cafe",
} = process.env;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI. Set it in .env.local.");
  process.exit(1);
}

if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error(
    "Missing FIREBASE_SERVICE_ACCOUNT_JSON. Point it to your Firebase service account JSON file."
  );
  process.exit(1);
}

if (!fs.existsSync(FIREBASE_SERVICE_ACCOUNT_JSON)) {
  console.error(
    `Service account file not found: ${FIREBASE_SERVICE_ACCOUNT_JSON}`
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(FIREBASE_SERVICE_ACCOUNT_JSON, "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

function isTimestampLike(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.toDate === "function" &&
    typeof value.seconds === "number"
  );
}

function serialize(value) {
  if (value == null) return value;
  if (value instanceof Date) return value;
  if (isTimestampLike(value)) return value.toDate();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    const entries = Object.entries(value).map(([k, v]) => [k, serialize(v)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function ensureStoreId(doc) {
  if (!doc || typeof doc !== "object") return doc;
  if (!doc.storeId) {
    doc.storeId = MIGRATE_DEFAULT_STORE_ID;
  }
  return doc;
}

function normalizeEmail(email) {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

async function getExistingId(col, firestoreId) {
  const existing = await col.findOne(
    { firestoreId },
    { projection: { _id: 1 } }
  );
  return existing?._id ?? null;
}

async function upsertByFirestoreId(col, firestoreId, payload) {
  const existingId = await getExistingId(col, firestoreId);
  const _id = existingId ?? new ObjectId();

  const setOnInsert = {};
  if (payload.createdAt == null) {
    setOnInsert.createdAt = new Date();
  }

  await col.updateOne(
    { _id },
    {
      $set: {
        ...payload,
        firestoreId,
        migratedAt: new Date(),
      },
      $setOnInsert: setOnInsert,
    },
    { upsert: true }
  );

  return _id;
}

async function migrateSimpleCollection({ db, name, wipe = false }) {
  const col = db.collection(name);
  if (wipe) {
    console.log(`[wipe] ${name}`);
    await col.deleteMany({});
  }

  console.log(`[read] ${name} from Firestore...`);
  const snap = await firestore.collection(name).get();
  console.log(`[read] ${name}: ${snap.size} docs`);

  let count = 0;
  for (const doc of snap.docs) {
    const data = ensureStoreId(serialize(doc.data()));
    if (name === "users" && (data.uid == null || data.uid === "")) {
      data.uid = doc.id;
    }
    if (name === "users") {
      const emailLower = normalizeEmail(data.email);
      if (emailLower) {
        data.emailLower = emailLower;
        data.email = emailLower;
      }
    }
    await upsertByFirestoreId(col, doc.id, data);
    count += 1;
  }

  console.log(`[done] ${name}: ${count} docs migrated`);
}

async function migrateEmployees({ db, wipe = false }) {
  const name = "employees";
  const col = db.collection(name);
  if (wipe) {
    console.log(`[wipe] ${name}`);
    await col.deleteMany({});
  }

  console.log(`[read] ${name} from Firestore...`);
  const snap = await firestore.collection(name).get();
  console.log(`[read] ${name}: ${snap.size} docs`);

  const map = new Map();

  for (const doc of snap.docs) {
    const data = ensureStoreId(serialize(doc.data()));
    const _id = await upsertByFirestoreId(col, doc.id, data);
    map.set(doc.id, _id.toHexString());
  }

  console.log(`[done] ${name}: ${map.size} docs migrated`);
  return map;
}

async function migratePayrolls({ db, wipe = false }) {
  const name = "payrolls";
  const col = db.collection(name);
  if (wipe) {
    console.log(`[wipe] ${name}`);
    await col.deleteMany({});
  }

  console.log(`[read] ${name} from Firestore...`);
  const snap = await firestore.collection(name).get();
  console.log(`[read] ${name}: ${snap.size} docs`);

  const map = new Map();

  for (const doc of snap.docs) {
    const data = ensureStoreId(serialize(doc.data()));
    const _id = await upsertByFirestoreId(col, doc.id, data);
    map.set(doc.id, _id.toHexString());
  }

  console.log(`[done] ${name}: ${map.size} docs migrated`);
  return map;
}

async function migratePayrollEntries({
  db,
  payrollMap,
  employeeMap,
  wipe = false,
}) {
  const name = "payroll_entries";
  const col = db.collection(name);
  if (wipe) {
    console.log(`[wipe] ${name}`);
    await col.deleteMany({});
  }

  console.log(`[read] ${name} from Firestore...`);
  const snap = await firestore.collection(name).get();
  console.log(`[read] ${name}: ${snap.size} docs`);

  let count = 0;
  for (const doc of snap.docs) {
    const data = ensureStoreId(serialize(doc.data()));

    if (data.payrollId && payrollMap.has(data.payrollId)) {
      data.payrollId = payrollMap.get(data.payrollId);
    }
    if (data.employeeId && employeeMap.has(data.employeeId)) {
      data.employeeId = employeeMap.get(data.employeeId);
    }

    await upsertByFirestoreId(col, doc.id, data);
    count += 1;
  }

  console.log(`[done] ${name}: ${count} docs migrated`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const wipe = args.has("--wipe");

  if (wipe) {
    console.warn(
      "[warn] --wipe enabled: target MongoDB collections will be cleared before migration."
    );
  }

  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db(MONGODB_DB);

  try {
    console.log(`[connect] MongoDB: ${MONGODB_DB}`);
    console.log("[connect] Firestore: ready");

    await migrateSimpleCollection({ db, name: "products", wipe });
    await migrateSimpleCollection({ db, name: "categories", wipe });
    await migrateSimpleCollection({ db, name: "tables", wipe });
    await migrateSimpleCollection({ db, name: "bills", wipe });

    const employeeMap = await migrateEmployees({ db, wipe });
    const payrollMap = await migratePayrolls({ db, wipe });
    await migratePayrollEntries({ db, payrollMap, employeeMap, wipe });

    await migrateSimpleCollection({ db, name: "reports", wipe });
    await migrateSimpleCollection({ db, name: "users", wipe });

    console.log("\nMigration completed successfully.");
    console.log(
      "Note: payroll_entries.payrollId and payroll_entries.employeeId were remapped to new Mongo ids where possible."
    );
  } finally {
    await mongo.close();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
