import { api } from "@/lib/http";

export type Employee = {
  id?: string;
  storeId: string;
  name: string;
  role: string;
  hourlyRate: number;
  createdAt?: unknown;
};

export async function getEmployees(storeId: string): Promise<Employee[]> {
  const data = await api.get<Employee[]>(
    `/api/employees?storeId=${encodeURIComponent(storeId)}`
  );
  return data || [];
}

export async function addEmployee(employee: Omit<Employee, "id">) {
  await api.post("/api/employees", employee);
}

export async function updateEmployee(
  id: string,
  data: Partial<Omit<Employee, "id" | "storeId" | "createdAt">>
) {
  await api.patch(`/api/employees/${id}`, data);
}

export async function deleteEmployee(id: string) {
  await api.delete(`/api/employees/${id}`);
}
