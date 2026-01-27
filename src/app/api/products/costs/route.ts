import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";

const COLLECTION = "products";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || "cafe";

  try {
    const db = await getDb();
    const docs = await db
      .collection(COLLECTION)
      .find({ storeId, cost: { $type: "number" } })
      .project({ product_code: 1, cost: 1 })
      .toArray();

    const map: Record<string, number> = {};
    docs.forEach((d) => {
      if (d.product_code && typeof d.cost === "number") {
        map[d.product_code] = d.cost;
      }
    });

    return ok(map);
  } catch (e) {
    return err("Failed to load product costs", 500, String(e));
  }
}