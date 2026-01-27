import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { toPlain } from "@/lib/mongo-helpers";

const COLLECTION = "employees";

type EmployeeBody = {
  storeId?: string;
  name?: string;
  role?: string;
  hourlyRate?: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || "cafe";

  try {
    const db = await getDb();
    const docs = await db
      .collection(COLLECTION)
      .find({ storeId })
      .sort({ name: 1 })
      .toArray();

    return ok(docs.map((d) => toPlain(d)));
  } catch (e) {
    return err("Failed to load employees", 500, String(e));
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EmployeeBody;

    if (!body.storeId || !body.name || !body.role) {
      return err("storeId, name and role are required", 400);
    }

    const payload = {
      storeId: body.storeId,
      name: body.name,
      role: body.role,
      hourlyRate: body.hourlyRate ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection(COLLECTION).insertOne(payload);
    return ok({ id: result.insertedId.toHexString() }, 201);
  } catch (e) {
    return err("Failed to create employee", 500, String(e));
  }
}