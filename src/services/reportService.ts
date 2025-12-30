import { db } from "@/lib/firebase";
import { CostRow } from "./cost";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  where,
  Timestamp,
  limit,
} from "firebase/firestore";

export type Report = {
  id?: string;
  createdAt: Timestamp; // Firestore Timestamp
  fileName: string;
  revenue: number;
  salary: number;
  electric: number;
  other: number;
  totalMaterialCost: number;
  totalCost: number;
  profit: number;
  details: CostRow[];
  storeId?: string;
};

export type NewReport = Omit<Report, "id" | "createdAt">;

const REPORTS_COLLECTION = "reports";

export async function saveReport(data: NewReport) {
  const docRef = await addDoc(collection(db, REPORTS_COLLECTION), {
    ...data,
    storeId: data.storeId || "cafe",
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getReports(
  limitCount = 20,
  startDate?: Date,
  endDate?: Date,
  storeId = "cafe"
) {
  let q = query(
    collection(db, REPORTS_COLLECTION),
    where("storeId", "==", storeId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  if (startDate && endDate) {
    q = query(
      collection(db, REPORTS_COLLECTION),
      where("storeId", "==", storeId),
      where("createdAt", ">=", Timestamp.fromDate(startDate)),
      where("createdAt", "<=", Timestamp.fromDate(endDate)),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Report[];
}

export async function getReportById(id: string) {
  const docRef = doc(db, REPORTS_COLLECTION, id);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  } as Report;
}
