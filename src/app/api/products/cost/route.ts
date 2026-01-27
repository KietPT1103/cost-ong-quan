import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";

const COLLECTION = "products";

type CostUpdateBody = {
  productCode?: string;
  storeId?: string;
  data?: {
    cost?: number | null;
    price?: number | null;
    category?: string;
  };
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as CostUpdateBody;
    const productCode = body.productCode?.trim();
    const storeId = body.storeId || "cafe";

    if (!productCode) return err("productCode is required", 400);
    if (!body.data) return err("data is required", 400);

    const update: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if ("cost" in body.data) {
      update.cost = body.data.cost ?? null;
      update.has_cost = true;
    }
    if ("price" in body.data) {
      update.price = body.data.price ?? null;
    }
    if ("category" in body.data) {
      update.category = body.data.category ?? "";
    }

    const db = await getDb();
    const result = await db.collection(COLLECTION).updateMany(
      { storeId, product_code: productCode },
      { $set: update }
    );

    return ok({
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (e) {
    return err("Failed to update product cost", 500, String(e));
  }
}