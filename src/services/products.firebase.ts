import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export type Product = {
  product_code: string;
  product_name: string;
  cost: number | null;
  has_cost: boolean;
};

// GET ALL
export async function getAllProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map((d) => d.data() as Product);
}

// UPSERT FROM EXCEL (KHÔNG GHI ĐÈ COST)
export async function upsertProductsFromExcel(
  products: { product_code: string; product_name: string }[]
) {
  for (const p of products) {
    await setDoc(
      doc(db, "products", p.product_code),
      {
        product_code: p.product_code,
        product_name: p.product_name,
        cost: null,
        has_cost: false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

// UPDATE COST
export async function updateProductCost(
  productCode: string,
  cost: number
) {
  await updateDoc(doc(db, "products", productCode), {
    cost,
    has_cost: true,
    updatedAt: serverTimestamp(),
  });
}
