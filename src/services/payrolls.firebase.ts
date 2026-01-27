import { api } from "@/lib/http";
import { toDate } from "@/lib/dates";
import { Employee } from "./employees.firebase";

export type Payroll = {
  id?: string;
  storeId: string;
  name: string;
  status: "draft" | "locked";
  createdAt?: Date | string | { seconds?: number };
};

export interface Shift {
  id: string;
  date: string;
  inTime: string;
  outTime: string;
  hours: number;
  isWeekend: boolean;
  isValid: boolean;
}

export type PayrollEntry = {
  id?: string;
  payrollId: string;
  employeeId: string;
  employeeName: string;
  role: string;
  hourlyRate: number;
  totalHours: number;
  weekendHours: number;
  salary: number;
  allowances?: { name: string; amount: number }[];
  note: string;
  salaryType?: "hourly" | "fixed";
  fixedSalary?: number;
  standardHours?: number;
  shifts?: Shift[];
};

function mapPayroll(p: Payroll): Payroll {
  const createdAt = toDate(p.createdAt) ?? p.createdAt;
  return { ...p, createdAt };
}

export async function getPayrolls(storeId: string): Promise<Payroll[]> {
  const data = await api.get<Payroll[]>(
    `/api/payrolls?storeId=${encodeURIComponent(storeId)}`
  );
  return (data || []).map(mapPayroll);
}

export async function createPayroll(
  storeId: string,
  name: string,
  employees: Employee[]
) {
  const res = await api.post<{ payrollId: string }>("/api/payrolls", {
    storeId,
    name,
    employees,
  });
  return res.payrollId;
}

export async function deletePayroll(payrollId: string) {
  await api.delete(`/api/payrolls/${payrollId}`);
}

export async function updatePayroll(id: string, data: Partial<Payroll>) {
  await api.patch(`/api/payrolls/${id}`, data);
}

export async function getPayrollEntries(
  payrollId: string
): Promise<PayrollEntry[]> {
  const qs = new URLSearchParams({ payrollId });
  const data = await api.get<PayrollEntry[]>(`/api/payroll-entries?${qs.toString()}`);
  return data || [];
}

export async function updatePayrollEntry(
  entryId: string,
  data: Partial<PayrollEntry>
) {
  await api.patch(`/api/payroll-entries/${entryId}`, data);
}

export async function addPayrollEntry(payrollId: string) {
  const qs = new URLSearchParams({ payrollId });
  await api.post(`/api/payroll-entries?${qs.toString()}`);
}

export async function deletePayrollEntry(entryId: string) {
  await api.delete(`/api/payroll-entries/${entryId}`);
}
