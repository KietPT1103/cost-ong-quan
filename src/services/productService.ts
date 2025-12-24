import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { PRODUCT_COST } from "@/config/productCost";

export type ProductCostValues = Record<string, number>;

/**
 * Fetches all product costs from Firebase and returns a map of product_code -> cost
 */
export async function fetchProductCosts(): Promise<ProductCostValues> {
  const snapshot = await getDocs(collection(db, "products"));
  const costMap: ProductCostValues = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    // Assuming the document has a 'cost' field and the ID is the product_code
    // OR the document has a 'product_code' field.
    // Based on productCost.firebase.ts, it uses doc(db, "products", data.product_code)
    // so doc.id should be product_code.
    if (typeof data.cost === "number") {
      costMap[doc.id] = data.cost;
    }
  });

  return costMap;
}

/**
 * Seeds the initial data from the local config file to Firebase.
 * This is a one-time migration helper.
 */
export async function seedProductCosts() {
  const batch = writeBatch(db);
  const entries = Object.entries(PRODUCT_COST);

  if (entries.length === 0) return;

  for (const [code, cost] of entries) {
    const docRef = doc(db, "products", code);
    batch.set(
      docRef,
      {
        product_code: code,
        cost: cost,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
  console.log(`Seeded ${entries.length} products to Firebase.`);
}
