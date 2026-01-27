import fs from "node:fs";
import path from "node:path";
import process from "node:process";

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

const { MONGODB_URI, MONGODB_DB = "cost_calculator" } = process.env;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

const STORE_IDS = ["cafe", "restaurant", "farm"];

function isObjectIdLike(value) {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

async function ensureCafeCategoriesSeed(db) {
  const cafeCount = await db.collection("categories").countDocuments({
    storeId: "cafe",
  });

  if (cafeCount > 0) return;

  const cafeProducts = await db
    .collection("products")
    .find({ storeId: "cafe" })
    .project({ category: 1 })
    .toArray();

  const distinctNames = new Set();
  for (const p of cafeProducts) {
    if (p.category) distinctNames.add(String(p.category));
  }

  if (distinctNames.size === 0) return;

  const now = new Date();
  const docs = Array.from(distinctNames).map((name) => ({
    name,
    description: "",
    order: Date.now(),
    storeId: "cafe",
    createdAt: now,
    updatedAt: now,
  }));

  await db.collection("categories").insertMany(docs, { ordered: false });
  console.log(`[seed] cafe categories: ${docs.length}`);
}

async function cloneCafeCategoriesToMissingStores(db) {
  const cafeCategories = await db
    .collection("categories")
    .find({ storeId: "cafe" })
    .toArray();

  if (cafeCategories.length === 0) return;

  for (const storeId of STORE_IDS) {
    if (storeId === "cafe") continue;

    const existing = await db.collection("categories").countDocuments({ storeId });
    if (existing > 0) continue;

    const now = new Date();
    const clones = cafeCategories.map((c) => ({
      name: c.name,
      description: c.description || "",
      order: c.order || Date.now(),
      storeId,
      createdAt: c.createdAt || now,
      updatedAt: now,
    }));

    if (clones.length > 0) {
      await db.collection("categories").insertMany(clones, { ordered: false });
      console.log(`[clone] categories cafe -> ${storeId}: ${clones.length}`);
    }
  }
}

async function buildCategoryMaps(db, storeId) {
  const categories = await db
    .collection("categories")
    .find({ storeId })
    .toArray();

  const byId = new Map();
  const byFirestoreId = new Map();
  const byName = new Map();

  for (const c of categories) {
    const id = c._id.toHexString();
    byId.set(id, c);

    if (c.firestoreId) {
      byFirestoreId.set(String(c.firestoreId), c);
    }

    const nameKey = normalizeName(c.name);
    if (nameKey && !byName.has(nameKey)) {
      byName.set(nameKey, c);
    }
  }

  return { categories, byId, byFirestoreId, byName };
}

async function ensureCategoryForValue(db, storeId, value, maps) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (isObjectIdLike(raw)) {
    const existingById = maps.byId.get(raw);
    if (existingById) return existingById;
  }

  const byFirestore = maps.byFirestoreId.get(raw);
  if (byFirestore) return byFirestore;

  const byName = maps.byName.get(normalizeName(raw));
  if (byName) return byName;

  const now = new Date();
  const doc = {
    name: raw,
    description: "",
    order: Date.now(),
    storeId,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection("categories").insertOne(doc);
  const created = { _id: result.insertedId, ...doc };

  const id = result.insertedId.toHexString();
  maps.byId.set(id, created);
  maps.byName.set(normalizeName(created.name), created);

  return created;
}

async function normalizeProductsForStore(db, storeId) {
  const productsCol = db.collection("products");

  const distinctValues = await productsCol.distinct("category", { storeId });

  const maps = await buildCategoryMaps(db, storeId);

  for (const value of distinctValues) {
    if (value == null || value === "") continue;
    await ensureCategoryForValue(db, storeId, value, maps);
  }

  const cursor = productsCol.find({ storeId });

  let updated = 0;
  let scanned = 0;

  while (await cursor.hasNext()) {
    const product = await cursor.next();
    if (!product) continue;
    scanned += 1;

    const rawCategory = product.category;
    if (!rawCategory) continue;

    const categoryDoc = await ensureCategoryForValue(
      db,
      storeId,
      rawCategory,
      maps
    );
    if (!categoryDoc) continue;

    const categoryId = categoryDoc._id.toHexString();

    if (product.category !== categoryId) {
      await productsCol.updateOne(
        { _id: product._id },
        {
          $set: {
            category: categoryId,
            updatedAt: new Date(),
          },
        }
      );
      updated += 1;
    }
  }

  return { storeId, scanned, updated };
}

async function main() {
  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db(MONGODB_DB);

  try {
    console.log(`[connect] MongoDB: ${MONGODB_DB}`);

    await ensureCafeCategoriesSeed(db);
    await cloneCafeCategoriesToMissingStores(db);

    const results = [];
    for (const storeId of STORE_IDS) {
      const res = await normalizeProductsForStore(db, storeId);
      results.push(res);
      console.log(`[normalize] ${storeId}: scanned=${res.scanned}, updated=${res.updated}`);
    }

    const categoriesByStore = await db.collection("categories").aggregate([
      { $group: { _id: "$storeId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();

    console.log("[summary] categories by store:", categoriesByStore);
    console.log("Done.");
  } finally {
    await mongo.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
