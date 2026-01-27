import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { PRODUCT_COST } from "@/config/productCost";

const COLLECTION = "products";

type Body = {
  storeId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const storeId = body.storeId || "cafe";
    const entries = Object.entries(PRODUCT_COST);

    if (entries.length === 0) {
      return ok({ seeded: 0 });
    }

    const db = await getDb();
    const now = new Date();

    const operations = entries.map(([product_code, cost]) => ({
      updateOne: {
        filter: { storeId, product_code },
        update: {
          $set: {
            product_code,
            cost,
            has_cost: true,
            updatedAt: now,
            storeId,
          },
          $setOnInsert: {
            product_name: product_code,
            price: null,
            category: "",
            createdAt: now,
          },
        },
        upsert: true,
      },
    }));

    const result = await db.collection(COLLECTION).bulkWrite(operations, {
      ordered: false,
    });

    return ok({
      seeded: result.upsertedCount + result.modifiedCount,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (e) {
    return err("Failed to seed product costs", 500, String(e));
  }
}