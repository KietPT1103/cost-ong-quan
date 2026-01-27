import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { toPlain } from "@/lib/mongo-helpers";

const COLLECTION = "tables";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || "cafe";

  try {
    const db = await getDb();
    const docs = await db
      .collection(COLLECTION)
      .find({ storeId })
      .sort({ name: 1 })
      .toArray();

    return ok(docs.map((d) => toPlain(d)));
  } catch (e) {
    return err("Failed to load tables", 500, String(e));
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      area?: string;
      storeId?: string;
    };

    const name = body.name?.trim();
    if (!name) return err("Table name is required", 400);

    const storeId = body.storeId || "cafe";

    const db = await getDb();
    const payload = {
      name,
      area: body.area?.trim() || "",
      active: true,
      order: Date.now(),
      storeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(payload);
    return ok({ id: result.insertedId.toHexString() }, 201);
  } catch (e) {
    return err("Failed to create table", 500, String(e));
  }
}