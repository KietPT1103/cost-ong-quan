"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPayrollEntries,
  updatePayrollEntry,
  PayrollEntry,
} from "@/services/payrolls.firebase";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { debounce } from "lodash";

export default function PayrollDetail({
  payrollId,
  onBack,
}: {
  payrollId: string;
  onBack: () => void;
}) {
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, [payrollId]);

  async function loadEntries() {
    setLoading(true);
    const data = await getPayrollEntries(payrollId);
    setEntries(data);
    setLoading(false);
  }

  // Auto-save debounce function
  const debouncedUpdate = useCallback(
    debounce(async (id: string, data: Partial<PayrollEntry>) => {
      setSavingId(id);
      await updatePayrollEntry(id, data);
      setSavingId(null);
    }, 1000),
    []
  );

  const handleUpdate = (
    index: number,
    field: keyof PayrollEntry,
    value: string | number
  ) => {
    const newEntries = [...entries];
    const entry = { ...newEntries[index] };
    const id = entry.id;

    if (!id) return;

    if (field === "totalHours") {
      entry.totalHours = Number(value);
    } else if (field === "weekendHours") {
      entry.weekendHours = Number(value);
    } else if (field === "note") {
      entry.note = String(value);
    }

    // Recalculate Salary
    // Salary = (Total Hours * Hourly Rate) + (Weekend Hours * 1000)
    // Note: This matches the user's request: "lương cuối tuần sẽ = lương theo h +1000"
    // Assuming "Total Hours" includes weekend hours.
    // If user meant "Total Regular Hours" and separate "Weekend Hours", the formula would be different.
    // Based on "totalHours + weekendHours", I assume totalHours input IS the grand total.
    // So Regular Hours = Total - Weekend (if mutually exclusive) OR Weekend hours are just an add-on bonus.
    // User request: "khi tạo bảng lương tôi sẽ nhập tổng giờ làm và tổng giờ làm cuối tuần, lương cuối tuần sẽ = lương theo h +1000"
    // Interpretation: Base salary for ALL hours is Rate. PLUS 1000 bonus for every weekend hour.
    // Formula: (TotalHours * Rate) + (WeekendHours * 1000)

    entry.salary =
      entry.totalHours * entry.hourlyRate + entry.weekendHours * 1000;

    newEntries[index] = entry;
    setEntries(newEntries);

    // Trigger auto-save
    debouncedUpdate(id, {
      totalHours: entry.totalHours,
      weekendHours: entry.weekendHours,
      salary: entry.salary,
      note: entry.note,
    });
  };

  const grandTotal = entries.reduce((sum, e) => sum + (e.salary || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>
        <h2 className="text-xl font-bold text-slate-800">
          Chi tiết bảng lương
        </h2>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-yellow-300 border-b-2 border-slate-200 text-slate-900">
              <tr>
                <th className="px-4 py-3 text-left font-bold border-r">
                  Tên Nhân Viên
                </th>
                <th className="px-4 py-3 text-center font-bold border-r w-[120px]">
                  Vai Trò
                </th>
                <th className="px-4 py-3 text-right font-bold border-r w-[120px]">
                  Số Giờ
                </th>
                <th className="px-4 py-3 text-right font-bold border-r w-[150px]">
                  Lương/h
                </th>
                <th className="px-4 py-3 text-right font-bold border-r w-[180px]">
                  Bonus Cuối Tuần
                  <br />
                  <span className="text-[10px] font-normal">(Số giờ)</span>
                </th>
                <th className="px-4 py-3 text-right font-bold border-r w-[150px]">
                  Tổng Tiền
                </th>
                <th className="px-4 py-3 text-left font-bold">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry, index) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium border-r">
                    {entry.employeeName}
                  </td>
                  <td className="px-4 py-2 border-r text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.role === "Leader"
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {entry.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-r">
                    <input
                      type="number"
                      className="w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1"
                      value={entry.totalHours || ""}
                      onChange={(e) =>
                        handleUpdate(index, "totalHours", e.target.value)
                      }
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-2 text-right border-r font-mono text-slate-500">
                    {entry.hourlyRate?.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 border-r">
                    <input
                      type="number"
                      className="w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1"
                      value={entry.weekendHours || ""}
                      onChange={(e) =>
                        handleUpdate(index, "weekendHours", e.target.value)
                      }
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-2 text-right border-r font-bold text-emerald-700">
                    <div className="flex items-center justify-end gap-2">
                      {savingId === entry.id && (
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                      )}
                      {entry.salary?.toLocaleString()} ₫
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1 text-slate-600 italic"
                      value={entry.note || ""}
                      onChange={(e) =>
                        handleUpdate(index, "note", e.target.value)
                      }
                      placeholder="Ghi chú..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right">
                  TỔNG CỘNG:
                </td>
                <td className="px-4 py-3 text-right text-emerald-700">
                  {grandTotal.toLocaleString()} ₫
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
