import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { parseObjectId } from "@/lib/mongo-helpers";

const COLLECTION = "payroll_entries";

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const objectId = parseObjectId(id);
  if (!objectId) return err("Invalid payroll entry id", 400);

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const update = { ...body, updatedAt: new Date() };

    const db = await getDb();
    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: objectId }, { $set: update });

    return ok({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (e) {
    return err("Failed to update payroll entry", 500, String(e));
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const objectId = parseObjectId(id);
  if (!objectId) return err("Invalid payroll entry id", 400);

  try {
    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: objectId });
    return ok({ deletedCount: result.deletedCount });
  } catch (e) {
    return err("Failed to delete payroll entry", 500, String(e));
  }
}