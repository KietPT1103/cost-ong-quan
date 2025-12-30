import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";

export type Product = {
  product_code: string;
  product_name: string;
  cost: number | null;
  price: number | null;
  category?: string;
  has_cost: boolean;
  storeId?: string;
};

// GET ALL
export async function getAllProducts(storeId = "cafe"): Promise<Product[]> {
  const q = query(collection(db, "products"), where("storeId", "==", storeId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Product);
}

// UPSERT FROM EXCEL (KHÔNG GHI ĐÈ COST)
export async function upsertProductsFromExcel(
  products: {
    product_code: string;
    product_name: string;
    price?: number | null;
    category?: string;
  }[],
  storeId: string
) {
  for (const p of products) {
    await setDoc(
      doc(db, "products", p.product_code),
      {
        product_code: p.product_code,
        product_name: p.product_name,
        cost: null,
        price: typeof p.price === "number" ? p.price : null,
        category: p.category || "",
        has_cost: false,
        storeId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

// UPDATE COST / PRICE / CATEGORY
export async function updateProductCost(
  productCode: string,
  data: { cost?: number | null; price?: number | null; category?: string }
) {
  await updateDoc(doc(db, "products", productCode), {
    ...("cost" in data ? { cost: data.cost, has_cost: true } : {}),
    ...("price" in data ? { price: data.price ?? null } : {}),
    ...("category" in data ? { category: data.category ?? "" } : {}),
    updatedAt: serverTimestamp(),
  });
}

// DELETE PRODUCT
export async function deleteProduct(productCode: string) {
  await deleteDoc(doc(db, "products", productCode));
}

// ADD NEW PRODUCT
export async function addProduct(product: Product) {
  await setDoc(doc(db, "products", product.product_code), {
    ...product,
    cost: product.cost ?? null,
    price: product.price ?? null,
    category: product.category ?? "",
    has_cost: product.has_cost ?? Boolean(product.cost),
    storeId: product.storeId || "cafe",
    updatedAt: serverTimestamp(),
  });
}
// MIGRATE OLD PRODUCTS (Temporary)
export async function migrateOldProducts(targetStoreId = "cafe") {
  const q = query(collection(db, "products"));
  const snap = await getDocs(q);
  let count = 0;

  for (const d of snap.docs) {
    const data = d.data() as Product;
    if (!data.storeId) {
      await updateDoc(doc(db, "products", d.id), {
        storeId: targetStoreId,
      });
      count++;
    }
  }
  return count;
}
