import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { toPlain } from "@/lib/mongo-helpers";

const PAYROLLS = "payrolls";
const ENTRIES = "payroll_entries";

type EmployeeLike = {
  id?: string;
  name: string;
  role: string;
  hourlyRate: number;
};

type CreatePayrollBody = {
  storeId?: string;
  name?: string;
  employees?: EmployeeLike[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || "cafe";

  try {
    const db = await getDb();
    const docs = await db
      .collection(PAYROLLS)
      .find({ storeId })
      .sort({ createdAt: -1 })
      .toArray();

    return ok(docs.map((d) => toPlain(d)));
  } catch (e) {
    return err("Failed to load payrolls", 500, String(e));
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePayrollBody;
    const storeId = body.storeId || "cafe";
    const name = body.name?.trim();

    if (!name) return err("Payroll name is required", 400);

    const db = await getDb();
    const now = new Date();

    const payrollResult = await db.collection(PAYROLLS).insertOne({
      storeId,
      name,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    const payrollId = payrollResult.insertedId.toHexString();
    const employees = body.employees || [];

    if (employees.length > 0) {
      const entryDocs = employees.map((emp) => ({
        payrollId,
        employeeId: emp.id || "unknown",
        employeeName: emp.name || "Unknown",
        role: emp.role || "Unknown",
        hourlyRate: emp.hourlyRate,
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
      }));

      if (entryDocs.length > 0) {
        await db.collection(ENTRIES).insertMany(entryDocs);
      }
    }

    return ok({ payrollId }, 201);
  } catch (e) {
    return err("Failed to create payroll", 500, String(e));
  }
}