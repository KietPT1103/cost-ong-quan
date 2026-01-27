import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { parseObjectId } from "@/lib/mongo-helpers";

type UpdateBillBody = {
  tableNumber?: string;
  note?: string;
  total?: number;
  items?: unknown[];
  storeId?: string;
  createdAt?: string | Date;
};

const COLLECTION = "bills";

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const objectId = parseObjectId(id);
  if (!objectId) return err("Invalid bill id", 400);

  try {
    const body = (await request.json()) as UpdateBillBody;
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.tableNumber !== undefined) update.tableNumber = body.tableNumber;
    if (body.total !== undefined) update.total = body.total;
    if (body.items !== undefined) update.items = body.items;
    if (body.storeId !== undefined) update.storeId = body.storeId;
    if (body.note !== undefined) update.note = body.note?.trim() || "";
    if (body.createdAt) {
      const d = new Date(body.createdAt);
      if (!Number.isNaN(d.getTime())) update.createdAt = d;
    }

    const db = await getDb();
    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: objectId }, { $set: update });

    return ok({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (e) {
    return err("Failed to update bill", 500, String(e));
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const objectId = parseObjectId(id);
  if (!objectId) return err("Invalid bill id", 400);

  try {
    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: objectId });
    return ok({ deletedCount: result.deletedCount });
  } catch (e) {
    return err("Failed to delete bill", 500, String(e));
  }
}
