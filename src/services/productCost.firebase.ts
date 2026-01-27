import { api } from "@/lib/http";

export type ProductCost = {
  product_code: string;
  product_name: string;
  cost: number;
  unit?: string;
  price?: number | null;
  category?: string;
};

export async function saveProductCost(data: ProductCost, storeId = "cafe") {
  await api.post("/api/products", {
    ...data,
    has_cost: true,
    storeId,
  });
}

export async function getProductCost(productCode: string, storeId = "cafe") {
  const qs = new URLSearchParams({ productCode, storeId });
  return api.get(`/api/products/by-code?${qs.toString()}`);
}

export async function getAllProductCosts(storeId = "cafe") {
  return api.get(`/api/products?storeId=${encodeURIComponent(storeId)}`);
}
