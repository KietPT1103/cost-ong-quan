import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

export type CafeTable = {
  id: string;
  name: string;
  area?: string;
  active?: boolean;
  order?: number;
};

const TABLES_COLLECTION = "tables";

export async function getTables(): Promise<CafeTable[]> {
  const q = query(collection(db, TABLES_COLLECTION), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(
    (doc) =>
      ({
        id: doc.id,
        name: (doc.data() as any).name || doc.id,
        ...doc.data(),
      } as CafeTable)
  );
}

export async function addTable(name: string, area?: string) {
  if (!name.trim()) return null;
  const docRef = await addDoc(collection(db, TABLES_COLLECTION), {
    name: name.trim(),
    area: area?.trim() || "",
    active: true,
    order: Date.now(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
