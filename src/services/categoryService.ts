import { api } from "@/lib/http";

export type Category = {
  id: string;
  name: string;
  description?: string;
  order?: number;
  storeId?: string;
};

export async function getCategories(storeId = "cafe"): Promise<Category[]> {
  const data = await api.get<Category[]>(
    `/api/categories?storeId=${encodeURIComponent(storeId)}`
  );

  return (data || []).map((c) => ({
    id: c.id,
    name: c.name || c.id,
    description: c.description || "",
    order: c.order,
    storeId: c.storeId,
  }));
}

export async function addCategory(
  name: string,
  description?: string,
  storeId = "cafe"
) {
  if (!name.trim()) return null;
  const res = await api.post<{ id: string }>("/api/categories", {
    name: name.trim(),
    description: description?.trim() || "",
    storeId,
  });
  return res?.id ?? null;
}
