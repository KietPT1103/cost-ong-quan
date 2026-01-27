import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { toPlain } from "@/lib/mongo-helpers";

const COLLECTION = "reports";

type NewReportBody = Record<string, unknown> & {
  storeId?: string;
  createdAt?: string | Date;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  includeInCashFlow?: boolean;
};

function toDate(value: unknown) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || "cafe";
  const limitCount = Number(searchParams.get("limitCount") || 20);
  const startDate = toDate(searchParams.get("startDate"));
  const endDate = toDate(searchParams.get("endDate"));

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
      .limit(Number.isFinite(limitCount) ? limitCount : 20)
      .toArray();

    return ok(docs.map((d) => toPlain(d)));
  } catch (e) {
    return err("Failed to load reports", 500, String(e));
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NewReportBody;
    const storeId = body.storeId || "cafe";
    const now = new Date();

    const createdAt = toDate(body.createdAt) || now;
    const startDate = body.startDate ? toDate(body.startDate) : undefined;
    const endDate = body.endDate ? toDate(body.endDate) : undefined;

    const payload = {
      ...body,
      storeId,
      createdAt,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      includeInCashFlow: body.includeInCashFlow ?? true,
      updatedAt: now,
    };

    const db = await getDb();
    const result = await db.collection(COLLECTION).insertOne(payload);
    return ok({ id: result.insertedId.toHexString() }, 201);
  } catch (e) {
    return err("Failed to save report", 500, String(e));
  }
}
