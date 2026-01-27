import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { toPlain } from "@/lib/mongo-helpers";

const COLLECTION = "bills";

type BillItem = {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

type NewBillBody = {
  tableNumber?: string;
  note?: string;
  total?: number;
  items?: BillItem[];
  storeId?: string;
  createdAt?: string | Date;
};

function parseDate(input: string | null) {
  if (!input) return undefined;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || "cafe";
  const limitCount = Number(searchParams.get("limitCount") || 100);
  const startDate = parseDate(searchParams.get("startDate"));
  const endDate = parseDate(searchParams.get("endDate"));

  const filter: Record<string, unknown> = { storeId };

  if (startDate || endDate) {
    filter.createdAt = {
      ...(startDate ? { $gte: startDate } : {}),
      ...(endDate ? { $lte: endDate } : {}),
    };
  }

  try {
    const db = await getDb();
    const docs = await db
      .collection(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Number.isFinite(limitCount) ? limitCount : 100)
      .toArray();

    return ok(docs.map((d) => toPlain(d)));
  } catch (e) {
    return err("Failed to load bills", 500, String(e));
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NewBillBody;

    if (!body.tableNumber || typeof body.total !== "number") {
      return err("tableNumber and total are required", 400);
    }

    const storeId = body.storeId || "cafe";
    const createdAt = body.createdAt ? new Date(body.createdAt) : new Date();

    const payload = {
      tableNumber: body.tableNumber,
      note: body.note?.trim() || "",
      total: body.total,
      items: body.items || [],
      storeId,
      createdAt,
      updatedAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection(COLLECTION).insertOne(payload);
    return ok({ id: result.insertedId.toHexString() }, 201);
  } catch (e) {
    return err("Failed to save bill", 500, String(e));
  }
}