import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  writeBatch,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { Employee } from "./employees.firebase";

export type Payroll = {
  id?: string;
  storeId: string;
  name: string; // e.g., "Jan 2025 - Period 1"
  status: "draft" | "locked";
  createdAt?: any;
};

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
  note: string;
};

const PAYROLLS_COLLECTION = "payrolls";
const ENTRIES_COLLECTION = "payroll_entries";

// --- PAYROLLS ---

export async function getPayrolls(storeId: string): Promise<Payroll[]> {
  const q = query(
    collection(db, PAYROLLS_COLLECTION),
    where("storeId", "==", storeId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payroll));
}

export async function createPayroll(
  storeId: string,
  name: string,
  employees: Employee[]
) {
  const batch = writeBatch(db);

  // 1. Create Payroll Record
  const payrollRef = doc(collection(db, PAYROLLS_COLLECTION));
  batch.set(payrollRef, {
    storeId,
    name,
    status: "draft",
    createdAt: serverTimestamp(),
  });

  // 2. Create Entries for each employee
  employees.forEach((emp) => {
    const entryRef = doc(collection(db, ENTRIES_COLLECTION));
    batch.set(entryRef, {
      payrollId: payrollRef.id,
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      hourlyRate: emp.hourlyRate,
      totalHours: 0,
      weekendHours: 0,
      salary: 0,
      note: "",
    });
  });

  await batch.commit();
  return payrollRef.id;
}

export async function deletePayroll(payrollId: string) {
  // Note: Ideally, we should also delete all entries, but for simplicity
  // allow them to be orphaned or delete them if needed carefully.
  // For a robust app, use cloud functions or batch delete.
  // Here we just update status to hidden or similar if needed,
  // but let's stick to deleting the payroll doc for now.
  // We'll leave entries for now or implement batch delete if user asks.
  // Actually, let's try to consistency delete entries.

  const entries = await getPayrollEntries(payrollId);
  const batch = writeBatch(db);

  batch.delete(doc(db, PAYROLLS_COLLECTION, payrollId));
  entries.forEach((e) => {
    if (e.id) batch.delete(doc(db, ENTRIES_COLLECTION, e.id));
  });

  await batch.commit();
}

// --- ENTRIES ---

export async function getPayrollEntries(
  payrollId: string
): Promise<PayrollEntry[]> {
  const q = query(
    collection(db, ENTRIES_COLLECTION),
    where("payrollId", "==", payrollId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PayrollEntry));
}

export async function updatePayrollEntry(
  entryId: string,
  data: Partial<PayrollEntry>
) {
  await updateDoc(doc(db, ENTRIES_COLLECTION, entryId), data);
}
