import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";

type UpsertExcelItem = {
  product_code: string;
  product_name: string;
  price?: number | null;
  category?: string;
};

type UpsertExcelBody = {
  products?: UpsertExcelItem[];
  storeId?: string;
};

const COLLECTION = "products";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpsertExcelBody;
    const products = body.products ?? [];
    const storeId = body.storeId || "cafe";

    if (products.length === 0) {
      return ok({ upserted: 0, modified: 0 });
    }

    const db = await getDb();
    const now = new Date();

    const operations = products
      .filter((p) => p.product_code && p.product_name)
      .map((p) => ({
        updateOne: {
          filter: { storeId, product_code: p.product_code },
          update: {
            $set: {
              product_code: p.product_code,
              product_name: p.product_name,
              price: typeof p.price === "number" ? p.price : null,
              category: p.category || "",
              storeId,
              updatedAt: now,
            },
            $setOnInsert: {
              cost: null,
              has_cost: false,
              createdAt: now,
            },
          },
          upsert: true,
        },
      }));

    if (operations.length === 0) {
      return ok({ upserted: 0, modified: 0, matched: 0 });
    }

    const result = await db.collection(COLLECTION).bulkWrite(operations, {
      ordered: false,
    });

    return ok({
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      matched: result.matchedCount,
    });
  } catch (e) {
    return err("Failed to upsert products from excel", 500, String(e));
  }
}
