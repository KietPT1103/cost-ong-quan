"use client";

import { useState, useEffect } from "react";
import {
  getEmployees,
  addEmployee,
  deleteEmployee,
  Employee,
} from "@/services/employees.firebase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import InputMoney from "@/components/InputMoney";
import { Trash2, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function EmployeeManager({ storeId }: { storeId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Staff");
  const [hourlyRate, setHourlyRate] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, [storeId]);

  async function loadEmployees() {
    if (!storeId) return;
    const data = await getEmployees(storeId);
    setEmployees(data);
  }

  async function handleAdd() {
    if (!name || !hourlyRate) {
      alert("Vui lòng nhập tên và mức lương");
      return;
    }
    setLoading(true);
    try {
      await addEmployee({ storeId, name, role, hourlyRate });
      setName("");
      setHourlyRate(0);
      await loadEmployees();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi thêm nhân viên");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc muốn xóa nhân viên này?")) return;
    try {
      await deleteEmployee(id);
      await loadEmployees();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi xóa nhân viên");
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Thêm nhân viên
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Tên nhân viên
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nguyen Van A"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Vai trò</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="Staff">Staff</option>
              <option value="Leader">Leader</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
          <InputMoney
            label="Lương theo giờ (VNĐ)"
            set={setHourlyRate}
            value={hourlyRate}
          />
          <Button
            onClick={handleAdd}
            disabled={loading}
            className="w-full gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Thêm mới
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-blue-600" />
            Danh sách nhân viên ({employees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Tên
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Vai trò
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    Lương/giờ
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium">{emp.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.role === "Leader"
                            ? "bg-amber-100 text-amber-700"
                            : emp.role === "Manager"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {emp.hourlyRate?.toLocaleString()} ₫
                    </td>
                    <td className="px-4 py-3 text-right">
                      {emp.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(emp.id!)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      Chưa có nhân viên nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
