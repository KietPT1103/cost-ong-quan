import { api } from "@/lib/http";
import { toDate, toIsoString } from "@/lib/dates";
import { CostRow } from "./cost";

export type ReportDate = Date | string | { seconds?: number; toDate?: () => Date } | null | undefined;

export type Report = {
  id?: string;
  createdAt: ReportDate;
  startDate?: ReportDate;
  endDate?: ReportDate;
  includeInCashFlow?: boolean;
  fileName: string;
  revenue: number;
  salary: number;
  electric: number;
  other: number;
  totalMaterialCost: number;
  totalCost: number;
  profit: number;
  details: CostRow[];
  storeId?: string;
};

export type NewReport = Omit<Report, "id"> & {
  createdAt?: ReportDate;
  startDate?: ReportDate;
  endDate?: ReportDate;
};

function mapReport(r: Report): Report {
  return {
    ...r,
    createdAt: toDate(r.createdAt) ?? r.createdAt,
    startDate: toDate(r.startDate) ?? r.startDate,
    endDate: toDate(r.endDate) ?? r.endDate,
  };
}

function normalizeDates(data: Partial<Report>) {
  const payload: Record<string, unknown> = { ...data };

  if ("createdAt" in data) {
    const d = toDate(data.createdAt);
    payload.createdAt = d ? toIsoString(d) : null;
  }
  if ("startDate" in data) {
    const d = toDate(data.startDate);
    payload.startDate = d ? toIsoString(d) : null;
  }
  if ("endDate" in data) {
    const d = toDate(data.endDate);
    payload.endDate = d ? toIsoString(d) : null;
  }

  return payload;
}

export async function saveReport(data: NewReport) {
  const payload = normalizeDates(data);
  const res = await api.post<{ id: string }>("/api/reports", payload);
  return res.id;
}

export async function getReports(
  limitCount = 20,
  startDate?: Date,
  endDate?: Date,
  storeId = "cafe"
) {
  const qs = new URLSearchParams({
    storeId,
    limitCount: String(limitCount),
  });

  const startIso = toIsoString(startDate);
  const endIso = toIsoString(endDate);
  if (startIso) qs.set("startDate", startIso);
  if (endIso) qs.set("endDate", endIso);

  const data = await api.get<Report[]>(`/api/reports?${qs.toString()}`);
  return (data || []).map(mapReport);
}

export async function getReportById(id: string) {
  const data = await api.get<Report | null>(`/api/reports/${id}`);
  return data ? mapReport(data) : null;
}

export async function updateReport(id: string, data: Partial<Report>) {
  const payload = normalizeDates(data);
  await api.patch(`/api/reports/${id}`, payload);
}

export async function deleteReport(id: string) {
  await api.delete(`/api/reports/${id}`);
}
