import { getDb } from "@/lib/mongodb";
import { ok, err } from "@/lib/api";
import { parseObjectId } from "@/lib/mongo-helpers";

const EMPLOYEES = "employees";
const PAYROLLS = "payrolls";
const ENTRIES = "payroll_entries";

type Shift = {
  id: string;
  date: string;
  inTime: string;
  outTime: string;
  hours: number;
  isWeekend: boolean;
  isValid: boolean;
};

type SummaryRow = {
  dbId?: string;
  Name: string;
  Role: string;
  Allowance: number;
  Note: string;
  TotalHours: number;
  WeekendHours: number;
  SalaryPerHour: number;
  TotalSalary: number;
  Shifts: Shift[];
};

type Body = {
  storeId?: string;
  startDate?: string;
  endDate?: string;
  summaryData?: SummaryRow[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const storeId = body.storeId || "cafe";
    const startDate = body.startDate || "";
    const endDate = body.endDate || "";
    const summaryData = body.summaryData || [];

    if (summaryData.length === 0) {
      return err("summaryData is required", 400);
    }

    const payrollName = `Bang luong ${startDate} - ${endDate}`.trim();
    const db = await getDb();
    const now = new Date();

    const payrollResult = await db.collection(PAYROLLS).insertOne({
      storeId,
      name: payrollName,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    const payrollId = payrollResult.insertedId.toHexString();
    const entryDocs: Record<string, unknown>[] = [];

    for (const row of summaryData) {
      let employeeId = row.dbId;

      if (employeeId) {
        const objectId = parseObjectId(employeeId);
        if (objectId) {
          await db.collection(EMPLOYEES).updateOne(
            { _id: objectId },
            {
              $set: {
                role: row.Role || "Nhan vien",
                hourlyRate: row.SalaryPerHour,
                updatedAt: now,
              },
            }
          );
        }
      }

      if (!employeeId) {
        const empResult = await db.collection(EMPLOYEES).insertOne({
          storeId,
          name: row.Name,
          role: row.Role || "Nhan vien",
          hourlyRate: row.SalaryPerHour,
          createdAt: now,
          updatedAt: now,
        });
        employeeId = empResult.insertedId.toHexString();
      }

      entryDocs.push({
        payrollId,
        employeeId: employeeId || "unknown",
        employeeName: row.Name,
        role: row.Role || "Nhan vien",
        hourlyRate: row.SalaryPerHour,
        totalHours: row.TotalHours,
        weekendHours: row.WeekendHours,
        salary: row.TotalSalary,
        allowances:
          row.Allowance > 0
            ? [{ name: "Phu cap", amount: row.Allowance }]
            : [],
        note: row.Note || "",
        salaryType: "hourly",
        fixedSalary: 0,
        standardHours: 0,
        shifts: row.Shifts || [],
        createdAt: now,
        updatedAt: now,
      });
    }

    if (entryDocs.length > 0) {
      await db.collection(ENTRIES).insertMany(entryDocs);
    }

    return ok({ payrollId }, 201);
  } catch (e) {
    return err("Failed to save timesheet payroll", 500, String(e));
  }
}
