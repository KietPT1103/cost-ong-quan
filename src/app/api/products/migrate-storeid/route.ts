import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";

const COLLECTIONS = ["products", "categories", "tables"] as const;

type Body = {
  storeId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const storeId = body.storeId || "cafe";

    const db = await getDb();
    let totalModified = 0;

    for (const name of COLLECTIONS) {
      const result = await db.collection(name).updateMany(
        { storeId: { $exists: false } },
        { $set: { storeId, updatedAt: new Date() } }
      );
      totalModified += result.modifiedCount;
    }

    return ok({ modifiedCount: totalModified });
  } catch (e) {
    return err("Failed to migrate storeId", 500, String(e));
  }
}