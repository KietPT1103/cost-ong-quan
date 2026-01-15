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
  addDoc,
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
  // 1. Get all existing products for this store to find matches
  const q = query(collection(db, "products"), where("storeId", "==", storeId));
  const snap = await getDocs(q);
  const existingMap = new Map<string, string>(); // code -> docId

  snap.forEach((d) => {
    const data = d.data();
    if (data.product_code) {
      existingMap.set(data.product_code, d.id);
    }
  });

  const batch = []; // For simplicity in loop, but ideally use writeBatch if < 500

  for (const p of products) {
    const existingDocId = existingMap.get(p.product_code);
    const dataToSave = {
      product_code: p.product_code,
      product_name: p.product_name,
      // cost: null, // Don't reset cost if it exists, logic below handles merge
      price: typeof p.price === "number" ? p.price : null,
      category: p.category || "",
      // has_cost: false, // Don't reset has_cost
      storeId,
      updatedAt: serverTimestamp(),
    };

    if (existingDocId) {
      // Update existing
      await setDoc(doc(db, "products", existingDocId), dataToSave, {
        merge: true,
      });
    } else {
      // Create new (Auto ID)
      await addDoc(collection(db, "products"), {
        ...dataToSave,
        cost: null,
        has_cost: false,
      });
    }
  }
}

// UPDATE COST / PRICE / CATEGORY
export async function updateProductCost(
  productCode: string,
  data: { cost?: number | null; price?: number | null; category?: string },
  storeId: string = "cafe" // Added storeId param
) {
  // Find doc by code + storeId
  const q = query(
    collection(db, "products"),
    where("product_code", "==", productCode),
    where("storeId", "==", storeId)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    // Should be unique, but if multiple, update all
    for (const d of snap.docs) {
      await updateDoc(doc(db, "products", d.id), {
        ...("cost" in data ? { cost: data.cost, has_cost: true } : {}),
        ...("price" in data ? { price: data.price ?? null } : {}),
        ...("category" in data ? { category: data.category ?? "" } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  } else {
    console.warn(
      `Product ${productCode} not found in store ${storeId} to update.`
    );
  }
}

// DELETE PRODUCT
export async function deleteProduct(productCode: string, storeId: string) {
  const q = query(
    collection(db, "products"),
    where("product_code", "==", productCode),
    where("storeId", "==", storeId)
  );
  const snap = await getDocs(q);

  for (const d of snap.docs) {
    await deleteDoc(doc(db, "products", d.id));
  }
}

// ADD NEW PRODUCT
export async function addProduct(product: Product) {
  // Use addDoc for Auto ID logic
  await addDoc(collection(db, "products"), {
    ...product,
    cost: product.cost ?? null,
    price: product.price ?? null,
    category: product.category ?? "",
    has_cost: product.has_cost ?? Boolean(product.cost),
    storeId: product.storeId || "cafe",
    updatedAt: serverTimestamp(),
  });
}
// MIGRATE OLD DATA (Products, Categories, Tables)
export async function migrateOldProducts(targetStoreId = "cafe") {
  const collections = ["products", "categories", "tables"];
  let totalCount = 0;

  for (const colName of collections) {
    const q = query(collection(db, colName));
    const snap = await getDocs(q);

    for (const d of snap.docs) {
      const data = d.data();
      // If storeId is missing, update it
      if (!data.storeId) {
        await updateDoc(doc(db, colName, d.id), {
          storeId: targetStoreId,
        });
        totalCount++;
      }
    }
  }
  return totalCount;
}
