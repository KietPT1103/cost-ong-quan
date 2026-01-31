import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { parseObjectId, toPlain } from "@/lib/mongo-helpers";

const COLLECTION = "reports";

function toDate(value: unknown) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function requireObjectId(id: string) {
  const objectId = parseObjectId(id);
  return objectId;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const objectId = id ? requireObjectId(id) : null;
  if (!objectId) return err("Invalid report id", 400);

  try {
    const db = await getDb();
    const doc = await db.collection(COLLECTION).findOne({ _id: objectId });
    if (!doc) return ok(null);
    return ok(toPlain(doc));
  } catch (e) {
    return err("Failed to load report", 500, String(e));
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const objectId = id ? requireObjectId(id) : null;
  if (!objectId) return err("Invalid report id", 400);

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const update: Record<string, unknown> = {
      ...body,
      updatedAt: new Date(),
    };

    if ("createdAt" in body) {
      const d = toDate(body.createdAt);
      if (d) update.createdAt = d;
    }
    if ("startDate" in body) {
      update.startDate = body.startDate ? toDate(body.startDate) ?? null : null;
    }
    if ("endDate" in body) {
      update.endDate = body.endDate ? toDate(body.endDate) ?? null : null;
    }

    const db = await getDb();
    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: objectId }, { $set: update });

    return ok({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (e) {
    return err("Failed to update report", 500, String(e));
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const objectId = id ? requireObjectId(id) : null;
  if (!objectId) return err("Invalid report id", 400);

  try {
    const db = await getDb();
    const result = await db
      .collection(COLLECTION)
      .deleteOne({ _id: objectId });
    return ok({ deletedCount: result.deletedCount });
  } catch (e) {
    return err("Failed to delete report", 500, String(e));
  }
}
