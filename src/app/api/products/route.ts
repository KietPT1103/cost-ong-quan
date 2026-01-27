import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { toPlain } from "@/lib/mongo-helpers";

const COLLECTION = "products";

type ProductPayload = {
  product_code: string;
  product_name: string;
  cost?: number | null;
  price?: number | null;
  category?: string;
  has_cost?: boolean;
  storeId?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || "cafe";

  try {
    const db = await getDb();
    const docs = await db
      .collection(COLLECTION)
      .find({ storeId })
      .sort({ product_name: 1 })
      .toArray();

    const data = docs.map((d) => {
      const plain = toPlain(d) as Record<string, unknown>;
      if (typeof plain.has_cost !== "boolean") {
        plain.has_cost = typeof plain.cost === "number";
      }
      return plain;
    });

    return ok(data);
  } catch (e) {
    return err("Failed to load products", 500, String(e));
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProductPayload;
    const storeId = body.storeId || "cafe";

    if (!body.product_code?.trim() || !body.product_name?.trim()) {
      return err("product_code and product_name are required", 400);
    }

    const payload = {
      product_code: body.product_code.trim(),
      product_name: body.product_name.trim(),
      cost: body.cost ?? null,
      price: body.price ?? null,
      category: body.category ?? "",
      has_cost: body.has_cost ?? typeof body.cost === "number",
      storeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await getDb();

    const result = await db.collection(COLLECTION).updateOne(
      { storeId, product_code: payload.product_code },
      {
        $set: payload,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return ok(
      {
        upsertedId: result.upsertedId?.toHexString() ?? null,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
      result.upsertedId ? 201 : 200
    );
  } catch (e) {
    return err("Failed to save product", 500, String(e));
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || "cafe";
  const productCode = searchParams.get("productCode");

  if (!productCode) return err("productCode is required", 400);

  try {
    const db = await getDb();
    const result = await db
      .collection(COLLECTION)
      .deleteMany({ storeId, product_code: productCode });

    return ok({ deletedCount: result.deletedCount });
  } catch (e) {
    return err("Failed to delete product", 500, String(e));
  }
}