import { api } from "@/lib/http";

export type Product = {
  product_code: string;
  product_name: string;
  cost: number | null;
  price: number | null;
  category?: string;
  has_cost: boolean;
  storeId?: string;
};

export async function getAllProducts(storeId = "cafe"): Promise<Product[]> {
  const data = await api.get<Product[]>(
    `/api/products?storeId=${encodeURIComponent(storeId)}`
  );
  return data || [];
}

export async function upsertProductsFromExcel(
  products: {
    product_code: string;
    product_name: string;
    price?: number | null;
    category?: string;
  }[],
  storeId: string
) {
  await api.post("/api/products/upsert-excel", { products, storeId });
}

export async function updateProductCost(
  productCode: string,
  data: { cost?: number | null; price?: number | null; category?: string },
  storeId: string = "cafe"
) {
  await api.patch("/api/products/cost", {
    productCode,
    data,
    storeId,
  });
}

export async function deleteProduct(productCode: string, storeId: string) {
  const qs = new URLSearchParams({ storeId, productCode });
  await api.delete(`/api/products?${qs.toString()}`);
}

export async function addProduct(product: Product) {
  await api.post("/api/products", {
    ...product,
    storeId: product.storeId || "cafe",
  });
}

export async function migrateOldProducts(targetStoreId = "cafe") {
  const res = await api.post<{ modifiedCount: number }>(
    "/api/products/migrate-storeid",
    { storeId: targetStoreId }
  );
  return res.modifiedCount;
}
