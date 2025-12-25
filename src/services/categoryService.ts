import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

export type Category = {
  id: string;
  name: string;
  description?: string;
  order?: number;
};

const COLLECTION = "categories";

export async function getCategories(): Promise<Category[]> {
  const q = query(collection(db, COLLECTION), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(
    (doc) =>
      ({
        id: doc.id,
        name: (doc.data() as any).name || doc.id,
        description: (doc.data() as any).description || "",
        order: (doc.data() as any).order,
      } as Category)
  );
}

export async function addCategory(name: string, description?: string) {
  if (!name.trim()) return null;
  const docRef = await addDoc(collection(db, COLLECTION), {
    name: name.trim(),
    description: description?.trim() || "",
    order: Date.now(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
