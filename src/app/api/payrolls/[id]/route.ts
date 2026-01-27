import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { parseObjectId } from "@/lib/mongo-helpers";

const PAYROLLS = "payrolls";
const ENTRIES = "payroll_entries";

type UpdatePayrollBody = {
  name?: string;
  status?: "draft" | "locked";
};

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const objectId = parseObjectId(id);
  if (!objectId) return err("Invalid payroll id", 400);

  try {
    const body = (await request.json()) as UpdatePayrollBody;
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) update.name = body.name;
    if (body.status !== undefined) update.status = body.status;

    const db = await getDb();
    const result = await db
      .collection(PAYROLLS)
      .updateOne({ _id: objectId }, { $set: update });

    return ok({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (e) {
    return err("Failed to update payroll", 500, String(e));
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const objectId = parseObjectId(id);
  if (!objectId) return err("Invalid payroll id", 400);

  try {
    const db = await getDb();
    const payrollDelete = await db.collection(PAYROLLS).deleteOne({ _id: objectId });
    const entriesDelete = await db.collection(ENTRIES).deleteMany({ payrollId: id });

    return ok({
      payrollDeleted: payrollDelete.deletedCount,
      entriesDeleted: entriesDelete.deletedCount,
    });
  } catch (e) {
    return err("Failed to delete payroll", 500, String(e));
  }
}