import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { toPlain } from "@/lib/mongo-helpers";

const COLLECTION = "products";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productCode = searchParams.get("productCode")?.trim();
  const storeId = searchParams.get("storeId") || "cafe";

  if (!productCode) return err("productCode is required", 400);

  try {
    const db = await getDb();
    const doc = await db
      .collection(COLLECTION)
      .findOne({ storeId, product_code: productCode });

    if (!doc) return ok(null);
    return ok(toPlain(doc));
  } catch (e) {
    return err("Failed to load product", 500, String(e));
  }
}