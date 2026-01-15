"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPayrollEntries,
  updatePayrollEntry,
  addPayrollEntry,
  deletePayrollEntry,
  PayrollEntry,
} from "@/services/payrolls.firebase";
import { Input } from "@/components/ui/Input";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Settings,
  Trash2,
  X,
  CalendarClock,
  Eye,
  AlertCircle,
} from "lucide-react";
import ShiftDetailModal, { Shift } from "@/app/timesheet/ShiftDetailModal";
import { Button } from "@/components/ui/Button";
import { debounce } from "lodash";
import InputMoney from "@/components/InputMoney";

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

  // Search, Filter, Sort State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof PayrollEntry | "totalIncome";
    direction: "asc" | "desc" | null;
  }>({ key: "totalIncome", direction: null });

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    role: true,
    hours: true,
    rate: true,
    bonus: true,
    allowance: true,
    total: true,
    note: true,
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Allowance Modal State
  const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(
    null
  );
  const [editAllowances, setEditAllowances] = useState<
    { name: string; amount: number }[]
  >([]);

  // Settings Modal State
  const [settingsEntryId, setSettingsEntryId] = useState<string | null>(null);
  const [settingsData, setSettingsData] = useState<{
    salaryType: "hourly" | "fixed";
    fixedSalary: number;
    standardHours: number;
  }>({ salaryType: "hourly", fixedSalary: 0, standardHours: 0 });

  // Shift Modal State
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [currentShiftEntry, setCurrentShiftEntry] =
    useState<PayrollEntry | null>(null);

  useEffect(() => {
    loadEntries();
  }, [payrollId]);

  async function loadEntries() {
    setLoading(true);
    const data = await getPayrollEntries(payrollId);
    setEntries(data);
    setLoading(false);
  }

  async function handleAddEntry() {
    setLoading(true);
    try {
      await addPayrollEntry(payrollId);
      await loadEntries();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi thêm dòng mới");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa nhân viên này khỏi bảng lương?"))
      return;

    setLoading(true);
    try {
      await deletePayrollEntry(entryId);
      // Remove from local state immediately to avoid reload flicker
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (error) {
      console.error(error);
      alert("Lỗi khi xóa dòng");
      await loadEntries(); // Reload to be safe
    } finally {
      setLoading(false);
    }
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
    value: any
  ) => {
    const newEntries = [...entries];
    // NOTE: We must find the correct entry in the original list if we are rendering a filtered list.
    // However, to simplify editing while filtering, standard practice is to update the original list.
    // But since the UI renders from 'entries' (or filteredEntries), we need to be careful with index.
    // Actually, 'index' passed here should ideally be the index in 'entries'.
    // If we render 'filteredEntries', the index passed from UI might be different from original 'entries'.
    // Use ID to update is safer.

    // BUT, the current architecture passes 'index' from the rendered map.
    // If I filter, the index 0 might be index 5 in original 'entries'.
    // FIX: I will update `entries` by finding the entry with `id` corresponding to the edited row.
    // To do that, I'll pass `entry.id` to handleUpdate instead of index, OR easier:
    // I'll keep using index but I have to map it back to the original entries.
    // A better approach for this small app:
    // Just find the entry in `entries` that matches the ID of the row being edited.
    // Let's refactor handleUpdate to take ID instead of Index.

    // Wait, refactoring from Index to ID might break quicky.
    // Let's modify handleUpdate to find index by ID inside.

    // Correction: The `index` param was used to update local state `entries[index]`.
    // If I render filtered list, I cannot use index for `entries`.

    // Let's change handleUpdate signature in the next steps (not in this block yet if complicated,
    // but actually I should fix it now).
    // I will assume for now I will fix the UI calling part to use a new handleUpdateById.
    // For this ReplaceBlock, I will just add the sort logic helper.
  };

  const handleOpenShiftModal = (entry: PayrollEntry) => {
    setCurrentShiftEntry(entry);
    setShiftModalOpen(true);
  };

  const handleSaveShifts = async (newShifts: Shift[]) => {
    if (!currentShiftEntry || !currentShiftEntry.id) return;

    // Recalculate totals from raw times
    let newTotal = 0;
    let newWeekend = 0;

    newShifts.forEach((s) => {
      // Logic copied from TimesheetPage to ensure consistency
      // Calculate raw hours from inTime/outTime for precision
      let rawHours = 0;
      if (s.inTime && s.outTime) {
        const start = new Date(s.inTime);
        let end = new Date(s.outTime);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
          const diff = end.getTime() - start.getTime();
          rawHours = diff / (1000 * 60 * 60);
        }
      }

      if (s.isValid && rawHours > 0) {
        newTotal += rawHours;
        if (s.isWeekend) newWeekend += rawHours;
      }
    });

    const totalHours = parseFloat(newTotal.toFixed(2));
    const weekendHours = parseFloat(newWeekend.toFixed(2));

    // Update Local State
    const index = entries.findIndex((e) => e.id === currentShiftEntry.id);
    if (index === -1) return;

    const updatedEntry = {
      ...entries[index],
      shifts: newShifts,
      totalHours,
      weekendHours,
    };

    // Recalculate Salary
    updatedEntry.salary = calculateSalary(updatedEntry);

    const newEntries = [...entries];
    newEntries[index] = updatedEntry;
    setEntries(newEntries);
    setShiftModalOpen(false);

    // Persist to DB
    await updatePayrollEntry(currentShiftEntry.id, {
      shifts: newShifts as any[], // Type mismatch bypass if needed
      totalHours,
      weekendHours,
      salary: updatedEntry.salary,
    });
  };

  // -- LOGIC TÍNH LƯƠNG MỚI --
  const calculateSalary = (entry: PayrollEntry) => {
    const totalAllowance = (entry.allowances || []).reduce(
      (sum, a) => sum + a.amount,
      0
    );

    // Use exact hours for calculation
    // Rounding only leads to inaccuracies (e.g. 72.32h should be paid exactly)

    let rawSalary = 0;

    if (entry.salaryType === "fixed") {
      // Fixed Salary Logic
      const standardHours = entry.standardHours || 0;
      const totalHours = entry.totalHours || 0;
      const fixedSalary = entry.fixedSalary || 0;
      const hourlyRate = entry.hourlyRate || 0; // Used for OT

      // OT Hours = Excess over standard
      const otHours = Math.max(0, totalHours - standardHours);
      const otPay = otHours * hourlyRate;

      // Weekend Bonus is always added on top
      const weekendBonus = (entry.weekendHours || 0) * 1000;

      rawSalary = fixedSalary + otPay + weekendBonus + totalAllowance;
    } else {
      // Hourly Logic
      rawSalary =
        (entry.totalHours || 0) * entry.hourlyRate +
        (entry.weekendHours || 0) * 1000 +
        totalAllowance;
    }

    // Round up to nearest 1000 (e.g. 10100 -> 11000)
    return Math.ceil(rawSalary / 1000) * 1000;
  };

  // -- RE-IMPLEMENT handleUpdate to use ID for safety with Filter/Sort --
  const handleUpdateById = (
    id: string,
    field: keyof PayrollEntry,
    value: any
  ) => {
    const newEntries = [...entries];
    const index = newEntries.findIndex((e) => e.id === id);
    if (index === -1) return;

    const entry = { ...newEntries[index] };

    if (field === "totalHours") entry.totalHours = Number(value);
    if (field === "weekendHours") entry.weekendHours = Number(value);
    if (field === "note") entry.note = String(value);
    if (field === "employeeName") entry.employeeName = String(value);
    if (field === "role") entry.role = String(value);
    if (field === "hourlyRate") entry.hourlyRate = Number(value);
    if (field === "allowances") entry.allowances = value;
    // New fields
    if (field === "salaryType") entry.salaryType = value;
    if (field === "fixedSalary") entry.fixedSalary = Number(value);
    if (field === "standardHours") entry.standardHours = Number(value);

    // Recalculate Salary
    entry.salary = calculateSalary(entry);

    newEntries[index] = entry;
    setEntries(newEntries);

    // Trigger auto-save
    debouncedUpdate(id, {
      totalHours: entry.totalHours,
      weekendHours: entry.weekendHours,
      salary: entry.salary,
      note: entry.note,
      employeeName: entry.employeeName,
      role: entry.role,
      hourlyRate: entry.hourlyRate,
      allowances: entry.allowances || [],
      salaryType: entry.salaryType,
      fixedSalary: entry.fixedSalary,
      standardHours: entry.standardHours,
    });
  };

  const openAllowanceModal = (entry: PayrollEntry) => {
    // Find index in original entries to keep using index for modal logic if needed,
    // or better switch modal to use ID or object ref.
    // Let's use ID for modal too.
    const index = entries.findIndex((e) => e.id === entry.id);
    setSelectedEntryIndex(index);
    setEditAllowances(entry.allowances || []);
  };

  const saveAllowances = () => {
    if (selectedEntryIndex === null) return;
    const entry = entries[selectedEntryIndex];
    if (entry && entry.id) {
      handleUpdateById(entry.id, "allowances", editAllowances);
    }
    setSelectedEntryIndex(null);
  };

  const addAllowance = () => {
    setEditAllowances([...editAllowances, { name: "", amount: 0 }]);
  };

  const removeAllowance = (i: number) => {
    setEditAllowances(editAllowances.filter((_, idx) => idx !== i));
  };

  const updateAllowance = (i: number, field: "name" | "amount", value: any) => {
    const newAllowances = [...editAllowances];
    newAllowances[i] = { ...newAllowances[i], [field]: value };
    setEditAllowances(newAllowances);
  };

  const openSettings = (entry: PayrollEntry) => {
    setSettingsEntryId(entry.id!);
    setSettingsData({
      salaryType: entry.salaryType || "hourly",
      fixedSalary: entry.fixedSalary || 0,
      standardHours: entry.standardHours || 0,
    });
  };

  const saveSettings = () => {
    if (!settingsEntryId) return;

    const newEntries = [...entries];
    const index = newEntries.findIndex((e) => e.id === settingsEntryId);
    if (index === -1) return;

    const entry = { ...newEntries[index] };
    entry.salaryType = settingsData.salaryType;
    entry.fixedSalary = settingsData.fixedSalary;
    entry.standardHours = settingsData.standardHours;

    // Recalculate with new settings
    entry.salary = calculateSalary(entry);

    newEntries[index] = entry;
    setEntries(newEntries);

    debouncedUpdate(settingsEntryId, {
      salaryType: entry.salaryType,
      fixedSalary: entry.fixedSalary,
      standardHours: entry.standardHours,
      salary: entry.salary,
    });

    setSettingsEntryId(null);
  };

  // -- FILTER & SORT LOGIC --
  const filteredEntries = entries
    .filter((entry) => {
      const matchesSearch = entry.employeeName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "All" || entry.role === filterRole;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (!sortConfig.key || !sortConfig.direction) return 0;

      const key = sortConfig.key;
      const direction = sortConfig.direction === "asc" ? 1 : -1;

      let valA: any = a[key as keyof PayrollEntry];
      let valB: any = b[key as keyof PayrollEntry];

      if (key === "totalIncome") {
        // Special case for Total Money if needed, though 'salary' is the field
        valA = a.salary;
        valB = b.salary;
      }

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return -1 * direction;
      if (valA > valB) return 1 * direction;
      return 0;
    });

  const handleSort = (key: keyof PayrollEntry | "totalIncome") => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const grandTotal = entries.reduce((sum, e) => sum + (e.salary || 0), 0);

  const RoleSelect = ({ value, onChange, className }: any) => (
    <select className={className} value={value} onChange={onChange}>
      <optgroup label="Cafe">
        <option value="Phục vụ">Phục vụ</option>
        <option value="Pha chế">Pha chế</option>
        <option value="Thu ngân">Thu ngân</option>
      </optgroup>
      <optgroup label="Bếp">
        <option value="Bếp">Bếp</option>
        <option value="Thu ngân bếp">Thu ngân bếp</option>
        <option value="Phục vụ bếp">Phục vụ bếp</option>
        <option value="Rửa chén">Rửa chén</option>
      </optgroup>
      <optgroup label="Farm">
        <option value="Chăm sóc thú">Chăm sóc thú</option>
        <option value="Thú Y">Thú Y</option>
        <option value="Thu ngân farm">Thu ngân farm</option>
        <option value="Soát vé">Soát vé</option>
        <option value="Thời vụ">Thời vụ</option>
        <option value="Bán hàng">Bán hàng</option>
      </optgroup>
      <optgroup label="Chung">
        <option value="Leader">Leader</option>
        <option value="MKT">MKT</option>
      </optgroup>
    </select>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Button>
          <h2 className="text-xl font-bold text-slate-800">
            Chi tiết bảng lương
          </h2>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tìm nhân viên..."
            className="w-48 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="h-10 px-3 rounded-md border border-input bg-white text-sm"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="All">Tất cả vai trò</option>
            <optgroup label="Cafe">
              <option value="Phục vụ">Phục vụ</option>
              <option value="Pha chế">Pha chế</option>
              <option value="Thu ngân">Thu ngân</option>
            </optgroup>
            <optgroup label="Bếp">
              <option value="Bếp">Bếp</option>
              <option value="Thu ngân bếp">Thu ngân bếp</option>
              <option value="Phục vụ bếp">Phục vụ bếp</option>
              <option value="Rửa chén">Rửa chén</option>
            </optgroup>
            <optgroup label="Farm">
              <option value="Chăm sóc thú">Chăm sóc thú</option>
              <option value="Thú Y">Thú Y</option>
              <option value="Thu ngân farm">Thu ngân farm</option>
              <option value="Soát vé">Soát vé</option>
              <option value="Thời vụ">Thời vụ</option>
              <option value="Bán hàng">Bán hàng</option>
            </optgroup>
            <optgroup label="Chung">
              <option value="Leader">Leader</option>
              <option value="MKT">MKT</option>
            </optgroup>
          </select>
        </div>

        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            className="bg-white"
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            title="Ẩn/Hiện cột"
          >
            <Eye className="w-4 h-4 text-slate-600" />
          </Button>
          {showColumnSelector && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="space-y-1">
                <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.name}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        name: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">Tên Nhân Viên</span>
                </label>
                <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.role}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        role: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">Vai Trò</span>
                </label>
                <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.hours}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        hours: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">Số Giờ</span>
                </label>
                <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.rate}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        rate: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">Lương/h</span>
                </label>
                <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.bonus}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        bonus: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">Bonus</span>
                </label>
                <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.allowance}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        allowance: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">Phụ cấp</span>
                </label>
                <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.total}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        total: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">Tổng Tiền</span>
                </label>
                <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.note}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        note: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">Ghi chú</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto max-h-[calc(100vh-200px)] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-yellow-300 border-b-2 border-slate-200 text-slate-900 sticky top-0 z-10">
              <tr>
                {visibleColumns.name && (
                  <th
                    className="px-4 py-3 text-left font-bold border-r w-[180px] cursor-pointer hover:bg-yellow-400 transition-colors"
                    onClick={() => handleSort("employeeName")}
                  >
                    Tên Nhân Viên{" "}
                    {sortConfig.key === "employeeName" &&
                      (sortConfig.direction === "asc" ? "▲" : "▼")}
                  </th>
                )}
                {visibleColumns.role && (
                  <th
                    className="px-4 py-3 text-center font-bold border-r w-[110px] cursor-pointer hover:bg-yellow-400 transition-colors"
                    onClick={() => handleSort("role")}
                  >
                    Vai Trò{" "}
                    {sortConfig.key === "role" &&
                      (sortConfig.direction === "asc" ? "▲" : "▼")}
                  </th>
                )}
                {visibleColumns.hours && (
                  <th className="px-4 py-3 text-right font-bold border-r w-[120px]">
                    Số Giờ
                  </th>
                )}
                {visibleColumns.rate && (
                  <th
                    className="px-4 py-3 text-right font-bold border-r w-[110px] cursor-pointer hover:bg-yellow-400 transition-colors"
                    onClick={() => handleSort("hourlyRate")}
                  >
                    Lương/h{" "}
                    {sortConfig.key === "hourlyRate" &&
                      (sortConfig.direction === "asc" ? "▲" : "▼")}
                  </th>
                )}
                {visibleColumns.bonus && (
                  <th className="px-4 py-3 text-right font-bold border-r w-[100px]">
                    Bonus
                    <br />
                    <span className="text-[10px] font-normal">(Cuối tuần)</span>
                  </th>
                )}
                {visibleColumns.allowance && (
                  <th className="px-4 py-3 text-left font-bold border-r w-[130px]">
                    Phụ cấp
                  </th>
                )}
                {visibleColumns.total && (
                  <th
                    className="px-4 py-3 text-right font-bold border-r w-[140px] cursor-pointer hover:bg-yellow-400 transition-colors"
                    onClick={() => handleSort("salary")}
                  >
                    Tổng Tiền{" "}
                    {sortConfig.key === "salary" &&
                      (sortConfig.direction === "asc" ? "▲" : "▼")}
                  </th>
                )}
                {visibleColumns.note && (
                  <th className="px-4 py-3 text-left font-bold min-w-[200px]">
                    Ghi chú
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEntries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={`group hover:bg-slate-50 ${
                    entry.salaryType === "fixed" ? "bg-blue-50/50" : ""
                  }`}
                >
                  {visibleColumns.name && (
                    <td className="px-2 py-2 font-medium border-r relative">
                      <div className="flex items-center gap-1">
                        {entry.shifts &&
                          entry.shifts.some(
                            (s) => !s.isValid || !s.inTime || !s.outTime
                          ) && (
                            <div
                              className="text-red-500 cursor-help"
                              title="Có ca làm việc lỗi hoặc chưa đủ thông tin"
                            >
                              <AlertCircle size={14} />
                            </div>
                          )}
                        <Input
                          value={entry.employeeName}
                          onChange={(e) =>
                            handleUpdateById(
                              entry.id!,
                              "employeeName",
                              e.target.value
                            )
                          }
                          className={`h-8 border-transparent focus:border-input bg-transparent shadow-none pr-8 ${
                            entry.shifts &&
                            entry.shifts.some(
                              (s) => !s.isValid || !s.inTime || !s.outTime
                            )
                              ? "text-red-600 font-bold"
                              : ""
                          }`}
                        />
                      </div>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openSettings(entry)}
                          className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-transparent"
                          title="Cấu hình lương"
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEntry(entry.id!)}
                          className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-transparent"
                          title="Xóa nhân viên này"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  )}
                  {visibleColumns.role && (
                    <td className="px-2 py-2 border-r text-center">
                      <RoleSelect
                        className="w-full h-8 rounded-md border-transparent bg-transparent hover:bg-slate-100 px-1 text-xs text-center cursor-pointer focus:ring-1 focus:ring-emerald-500"
                        value={entry.role}
                        onChange={(e: any) =>
                          handleUpdateById(entry.id!, "role", e.target.value)
                        }
                      />
                    </td>
                  )}
                  {visibleColumns.hours && (
                    <td className="px-2 py-2 border-r relative group/cell">
                      <input
                        type="number"
                        className="w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1 pr-7"
                        value={entry.totalHours || ""}
                        onChange={(e) =>
                          handleUpdateById(
                            entry.id!,
                            "totalHours",
                            e.target.value
                          )
                        }
                        placeholder="0"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-indigo-500 hover:bg-indigo-50"
                          onClick={() => handleOpenShiftModal(entry)}
                          title="Xem/Sửa chi tiết chấm công"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                  {visibleColumns.rate && (
                    <td className="px-2 py-2 text-right border-r font-mono text-slate-500">
                      {entry.salaryType === "fixed" ? (
                        <div
                          className="cursor-help text-xs"
                          title={`Lương cứng: ${entry.fixedSalary?.toLocaleString()}đ\nĐịnh mức: ${
                            entry.standardHours
                          }h\nOT: ${entry.hourlyRate.toLocaleString()}đ/h`}
                        >
                          <span className="font-bold text-blue-600">Fixed</span>
                          <div className="text-[10px]">
                            {entry.hourlyRate.toLocaleString()} (OT)
                          </div>
                        </div>
                      ) : (
                        <InputMoney
                          value={entry.hourlyRate}
                          set={(val) =>
                            handleUpdateById(entry.id!, "hourlyRate", val)
                          }
                          className="h-8 border-transparent bg-transparent shadow-none text-right px-1"
                        />
                      )}
                    </td>
                  )}
                  {visibleColumns.bonus && (
                    <td className="px-2 py-2 border-r">
                      <input
                        type="number"
                        className="w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1"
                        value={entry.weekendHours || ""}
                        onChange={(e) =>
                          handleUpdateById(
                            entry.id!,
                            "weekendHours",
                            e.target.value
                          )
                        }
                        placeholder="0"
                      />
                    </td>
                  )}
                  {visibleColumns.allowance && (
                    <td
                      className="px-2 py-2 border-r cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => openAllowanceModal(entry)}
                    >
                      <div className="flex flex-wrap gap-1">
                        {entry.allowances && entry.allowances.length > 0 ? (
                          entry.allowances.map((a, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 cursor-help"
                              title={`${
                                a.name
                              }: ${a.amount.toLocaleString()} ₫`}
                            >
                              {a.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic pl-2">
                            + Thêm
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleColumns.total && (
                    <td className="px-4 py-2 text-right border-r font-bold text-emerald-700">
                      <div className="flex items-center justify-end gap-2">
                        {savingId === entry.id && (
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                        )}
                        {entry.salary?.toLocaleString()} ₫
                      </div>
                    </td>
                  )}
                  {visibleColumns.note && (
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1 text-slate-600 italic text-xs"
                        value={entry.note || ""}
                        onChange={(e) =>
                          handleUpdateById(entry.id!, "note", e.target.value)
                        }
                        placeholder="Ghi chú..."
                      />
                    </td>
                  )}
                </tr>
              ))}
              {!searchTerm && (
                <tr>
                  <td
                    colSpan={
                      Object.values(visibleColumns).filter(Boolean).length
                    }
                    className="p-2 bg-slate-50 border-t"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddEntry}
                      className="w-full text-slate-500 hover:text-emerald-600 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm nhân viên vào bảng lương này
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t sticky bottom-0 z-10">
              <tr>
                {visibleColumns.name && (
                  <td colSpan={2} className="px-4 py-3 text-right"></td>
                )}
                {visibleColumns.role && (
                  <td className="px-4 py-3 text-right">TỔNG CỘNG:</td>
                )}
                {visibleColumns.hours && (
                  <td className="px-4 py-3 text-right font-bold border-r"></td>
                )}
                {visibleColumns.rate && (
                  <td className="px-4 py-3 text-right font-bold border-r"></td>
                )}
                {visibleColumns.bonus && (
                  <td className="px-4 py-3 text-right font-bold border-r"></td>
                )}
                {visibleColumns.allowance && (
                  <td className="px-4 py-3 text-right font-bold border-r"></td>
                )}
                {visibleColumns.total && (
                  <td className="px-4 py-3 text-right text-emerald-700 border-r">
                    {grandTotal.toLocaleString()} ₫
                  </td>
                )}
                {visibleColumns.note && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Allowance Modal / Dialog */}
      {selectedEntryIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-lg">Quản lý phụ cấp</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEntryIndex(null)}
                className="h-8 w-8 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {editAllowances.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input
                      placeholder="Tên khoản thu/chi"
                      value={item.name}
                      onChange={(e) =>
                        updateAllowance(i, "name", e.target.value)
                      }
                      className="flex-1"
                    />
                    <div className="w-32">
                      <InputMoney
                        value={item.amount}
                        set={(val) => updateAllowance(i, "amount", val)}
                        placeholder="Số tiền"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAllowance(i)}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={addAllowance}
                className="w-full gap-2 border-dashed"
              >
                <Plus className="w-4 h-4" />
                Thêm khoản phụ cấp
              </Button>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedEntryIndex(null)}
              >
                Hủy
              </Button>
              <Button
                onClick={saveAllowances}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {settingsEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-lg">Cấu hình lương</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsEntryId(null)}
                className="h-8 w-8 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Cách tính lương
                </label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                      settingsData.salaryType === "hourly"
                        ? "bg-white shadow text-emerald-700"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                    onClick={() =>
                      setSettingsData({ ...settingsData, salaryType: "hourly" })
                    }
                  >
                    Theo giờ
                  </button>
                  <button
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                      settingsData.salaryType === "fixed"
                        ? "bg-white shadow text-blue-700"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                    onClick={() =>
                      setSettingsData({ ...settingsData, salaryType: "fixed" })
                    }
                  >
                    Cố định (Tháng)
                  </button>
                </div>
              </div>

              {settingsData.salaryType === "fixed" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase font-semibold">
                      Lương cứng (VND)
                    </label>
                    <InputMoney
                      value={settingsData.fixedSalary}
                      set={(val) =>
                        setSettingsData({ ...settingsData, fixedSalary: val })
                      }
                      className="bg-slate-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase font-semibold">
                      Định mức giờ (Tháng)
                    </label>
                    <input
                      type="number"
                      value={settingsData.standardHours}
                      onChange={(e) =>
                        setSettingsData({
                          ...settingsData,
                          standardHours: Number(e.target.value),
                        })
                      }
                      className="w-full text-right px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                  <div className="p-3 bg-blue-50 rounded text-xs text-blue-700">
                    <p>
                      Nếu làm vượt <b>{settingsData.standardHours}h</b>, giờ làm
                      thêm sẽ được tính dựa trên đơn giá giờ ở bảng bên ngoài.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSettingsEntryId(null)}
              >
                Hủy
              </Button>
              <Button
                onClick={saveSettings}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Lưu cấu hình
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SHIFT DETAIL MODAL */}
      <ShiftDetailModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        onSave={handleSaveShifts}
        employeeName={currentShiftEntry?.employeeName || ""}
        employeeId={currentShiftEntry?.employeeId || ""}
        initialShifts={currentShiftEntry?.shifts || []}
      />
    </div>
  );
}
