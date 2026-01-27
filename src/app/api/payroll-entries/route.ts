import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { toPlain } from "@/lib/mongo-helpers";

const COLLECTION = "payroll_entries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const payrollId = searchParams.get("payrollId");
  if (!payrollId) return err("payrollId is required", 400);

  try {
    const db = await getDb();
    const docs = await db.collection(COLLECTION).find({ payrollId }).toArray();
    return ok(docs.map((d) => toPlain(d)));
  } catch (e) {
    return err("Failed to load payroll entries", 500, String(e));
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const payrollId = searchParams.get("payrollId");
  if (!payrollId) return err("payrollId is required", 400);

  try {
    const now = new Date();
    const entry = {
      payrollId,
      employeeId: `manual_${Date.now()}`,
      employeeName: "Nhan vien moi",
      role: "Phuc vu",
      hourlyRate: 0,
      totalHours: 0,
      weekendHours: 0,
      salary: 0,
      allowances: [],
      note: "",
      salaryType: "hourly",
      fixedSalary: 0,
      standardHours: 0,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const result = await db.collection(COLLECTION).insertOne(entry);
    return ok({ id: result.insertedId.toHexString() }, 201);
  } catch (e) {
    return err("Failed to add payroll entry", 500, String(e));
  }
}
