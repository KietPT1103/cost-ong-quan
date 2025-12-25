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
