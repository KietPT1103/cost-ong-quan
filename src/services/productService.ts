import { api } from "@/lib/http";

export type ProductCostValues = Record<string, number>;

export async function fetchProductCosts(
  storeId = "cafe"
): Promise<ProductCostValues> {
  const data = await api.get<ProductCostValues>(
    `/api/products/costs?storeId=${encodeURIComponent(storeId)}`
  );
  return data || {};
}

export async function seedProductCosts(storeId = "cafe") {
  const res = await api.post<{ seeded: number }>("/api/products/seed", {
    storeId,
  });
  console.log(`Seeded ${res.seeded} products to MongoDB.`);
}
