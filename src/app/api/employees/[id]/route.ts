import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { parseObjectId } from "@/lib/mongo-helpers";

const COLLECTION = "employees";

type UpdateEmployeeBody = {
  name?: string;
  role?: string;
  hourlyRate?: number;
};

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const objectId = parseObjectId(id);
  if (!objectId) return err("Invalid employee id", 400);

  try {
    const body = (await request.json()) as UpdateEmployeeBody;
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) update.name = body.name;
    if (body.role !== undefined) update.role = body.role;
    if (body.hourlyRate !== undefined) update.hourlyRate = body.hourlyRate;

    const db = await getDb();
    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: objectId }, { $set: update });

    return ok({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (e) {
    return err("Failed to update employee", 500, String(e));
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const objectId = parseObjectId(id);
  if (!objectId) return err("Invalid employee id", 400);

  try {
    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: objectId });
    return ok({ deletedCount: result.deletedCount });
  } catch (e) {
    return err("Failed to delete employee", 500, String(e));
  }
}