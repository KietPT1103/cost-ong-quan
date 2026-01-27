import { api } from "@/lib/http";
import { toDate, toIsoString } from "@/lib/dates";

export type BillItemInput = {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type NewBill = {
  tableNumber: string;
  note?: string;
  total: number;
  items: BillItemInput[];
  storeId?: string;
};

export type Bill = NewBill & {
  id: string;
  createdAt?: Date | string | { seconds?: number };
};

type BillOptions = {
  startDate?: Date;
  endDate?: Date;
  limitCount?: number;
  storeId?: string;
};

function mapBill(b: Bill): Bill {
  const createdAt = toDate(b.createdAt) ?? b.createdAt;
  return { ...b, createdAt };
}

export async function saveBill(data: NewBill) {
  const res = await api.post<{ id: string }>("/api/bills", data);
  return res.id;
}

export async function getRecentBills(storeId = "cafe", limitCount = 20) {
  const qs = new URLSearchParams({
    storeId,
    limitCount: String(limitCount),
  });
  const data = await api.get<Bill[]>(`/api/bills?${qs.toString()}`);
  return (data || []).map(mapBill);
}

export async function getBills(options?: BillOptions) {
  const {
    startDate,
    endDate,
    limitCount = 100,
    storeId = "cafe",
  } = options || {};

  const qs = new URLSearchParams({
    storeId,
    limitCount: String(limitCount),
  });

  const startIso = toIsoString(startDate);
  const endIso = toIsoString(endDate);
  if (startIso) qs.set("startDate", startIso);
  if (endIso) qs.set("endDate", endIso);

  const data = await api.get<Bill[]>(`/api/bills?${qs.toString()}`);
  return (data || []).map(mapBill);
}

export async function updateBill(
  id: string,
  data: Partial<NewBill> & { createdAt?: Date }
) {
  const payload: Record<string, unknown> = {};

  if (data.tableNumber !== undefined) payload.tableNumber = data.tableNumber;
  if (data.total !== undefined) payload.total = data.total;
  if (data.items !== undefined) payload.items = data.items;
  if (data.storeId !== undefined) payload.storeId = data.storeId;
  if (data.note !== undefined) payload.note = data.note?.trim() || "";

  const createdAtIso = toIsoString(data.createdAt);
  if (createdAtIso) payload.createdAt = createdAtIso;

  if (Object.keys(payload).length === 0) return;

  await api.patch(`/api/bills/${id}`, payload);
}

export async function deleteBill(id: string) {
  await api.delete(`/api/bills/${id}`);
}
