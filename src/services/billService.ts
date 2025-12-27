import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  doc,
  updateDoc,
  deleteDoc,
  QueryConstraint,
} from "firebase/firestore";

export type BillItemInput = {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type NewBill = {
  tableNumber: string;
  note?: string;
  total: number;
  items: BillItemInput[];
};

export type Bill = NewBill & {
  id: string;
  createdAt: Timestamp;
};

const BILLS_COLLECTION = "bills";

export async function saveBill(data: NewBill) {
  const payload: Record<string, unknown> = {
    tableNumber: data.tableNumber,
    total: data.total,
    items: data.items,
    createdAt: serverTimestamp(),
  };

  if (data.note && data.note.trim()) {
    payload.note = data.note.trim();
  }

  const docRef = await addDoc(collection(db, BILLS_COLLECTION), payload);

  return docRef.id;
}

export async function getRecentBills(limitCount = 20) {
  const q = query(
    collection(db, BILLS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...(doc.data() as Omit<Bill, "id">),
      } as Bill)
  );
}

export async function getBills(options?: {
  startDate?: Date;
  endDate?: Date;
  limitCount?: number;
}) {
  const { startDate, endDate, limitCount = 100 } = options || {};
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];

  if (startDate) {
    constraints.push(where("createdAt", ">=", Timestamp.fromDate(startDate)));
  }
  if (endDate) {
    constraints.push(where("createdAt", "<=", Timestamp.fromDate(endDate)));
  }
  if (limitCount) {
    constraints.push(limit(limitCount));
  }

  const q = query(collection(db, BILLS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...(doc.data() as Omit<Bill, "id">),
      } as Bill)
  );
}

export async function updateBill(
  id: string,
  data: Partial<NewBill> & { createdAt?: Date }
) {
  const payload: Record<string, unknown> = {};

  if (data.tableNumber !== undefined) payload.tableNumber = data.tableNumber;
  if (data.total !== undefined) payload.total = data.total;
  if (data.items !== undefined) payload.items = data.items;

  if (data.note !== undefined) {
    payload.note = data.note?.trim() || "";
  }

  if (data.createdAt) {
    payload.createdAt = Timestamp.fromDate(data.createdAt);
  }

  if (Object.keys(payload).length === 0) return;

  await updateDoc(doc(db, BILLS_COLLECTION, id), payload);
}

export async function deleteBill(id: string) {
  await deleteDoc(doc(db, BILLS_COLLECTION, id));
}
