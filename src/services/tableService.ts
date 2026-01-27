import { api } from "@/lib/http";

export type CafeTable = {
  id: string;
  name: string;
  area?: string;
  active?: boolean;
  order?: number;
  storeId?: string;
};

export async function getTables(storeId = "cafe"): Promise<CafeTable[]> {
  const data = await api.get<CafeTable[]>(
    `/api/tables?storeId=${encodeURIComponent(storeId)}`
  );
  return data || [];
}

export async function addTable(name: string, area?: string, storeId = "cafe") {
  if (!name.trim()) return null;
  const res = await api.post<{ id: string }>("/api/tables", {
    name: name.trim(),
    area: area?.trim() || "",
    storeId,
  });
  return res?.id ?? null;
}
