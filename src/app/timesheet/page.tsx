"use client";

import ShiftDetailModal, { Shift } from "./ShiftDetailModal";
import React, { useState } from "react";
import { Button } from "@/components/ui/Button"; // Assuming Button exists
import { Input } from "@/components/ui/Input"; // Assuming Input exists
import { Card } from "@/components/ui/Card"; // Assuming Card exists
import * as XLSX from "xlsx"; // Useful if we want to export, or just parse text manually.
import { Save, Upload, FileText, Calculator } from "lucide-react";

interface TimesheetRow {
  No: string;
  TMNo: string;
  EnNo: string;
  Name: string;
  Mode: string;
  INOUT: string;
  DateTime: string;
}

interface ProcessedShift {
  Name: string;
  Date: string;
  InTime: string;
  OutTime: string;
  WorkHours: number;
  IsWeekend: boolean;
}

interface EmployeeSummary {
  Name: string;
  EnNo: string;
  TotalHours: number;
  WeekendHours: number;
  SalaryPerHour: number;
  TotalSalary: number;
  Errors: string[];
  Shifts: Shift[];
}

export default function TimesheetPage() {
  const [file, setFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summaryData, setSummaryData] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredError, setHoveredError] = useState<{
    x: number;
    y: number;
    errors: string[];
  } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpIndex, setSelectedEmpIndex] = useState<number | null>(null);

  const filteredData = summaryData.filter(
    (emp) =>
      emp.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.EnNo.includes(searchTerm)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseFile = async (file: File): Promise<TimesheetRow[]> => {
    const text = await file.text();
    const lines = text.split("\n");
    const headers = lines[0].split("\t").map((h) => h.trim());
    const data: TimesheetRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split("\t");
      // Simple mapping based on known columns
      // No, TMNo, EnNo, Name, Mode, INOUT, DateTime
      // Handle potential misalignment if name is empty strictly?
      // Python code: data = pd.read_csv(..., sep="\t")
      // We will try to map by index assuming the user provided format is consistent
      // Looking at user code: No, TMNo, EnNo, Name, Mode, INOUT, DateTime

      // Safety check for columns length
      if (values.length < 7) continue;

      const row: any = {};
      // Map known headers or by index
      // Headers from file might be: No, TMNo, EnNo, Name, Mode, INOUT, DateTime
      row["No"] = values[0];
      row["TMNo"] = values[1];
      row["EnNo"] = values[2];
      row["Name"] = values[3];
      row["Mode"] = values[4];
      row["INOUT"] = values[5];
      row["DateTime"] = values[6]; // Format 2025/11/05 09:33:16 or similar
      data.push(row as TimesheetRow);
    }
    return data;
  };

  const handleHoursChange = (
    index: number,
    field: "TotalHours" | "WeekendHours",
    value: string
  ) => {
    const newSummary = [...summaryData];
    const val = parseFloat(value) || 0;
    newSummary[index][field] = val;

    // Recalculate salary automatically
    const salaryRate = newSummary[index].SalaryPerHour;
    const weekendHours = newSummary[index].WeekendHours;
    // Base salary + 1000 extra per weekend hour
    const total =
      newSummary[index].TotalHours * salaryRate + weekendHours * 1000;
    newSummary[index].TotalSalary = Math.round(total / 1000) * 1000;

    setSummaryData(newSummary);
  };

  const processData = async () => {
    if (!file || !startDate || !endDate) {
      setError("Vui lòng chọn file và khoảng thời gian.");
      return;
    }
    setLoading(true);
    setError("");
    setSummaryData([]);

    try {
      const rawData = await parseFile(file);

      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T23:59:59`);

      // Filter and convert dates
      const filtered = rawData.filter((row) => {
        const dt = new Date(row.DateTime);
        return !isNaN(dt.getTime()) && dt >= start && dt <= end;
      });

      // Group by Name
      const grouped: { [key: string]: TimesheetRow[] } = {};
      filtered.forEach((row) => {
        const name = row.Name || `Unknown_${row.EnNo}`;
        if (!grouped[name]) grouped[name] = [];
        grouped[name].push(row);
      });

      const summaries: EmployeeSummary[] = [];

      Object.keys(grouped).forEach((name) => {
        // Sort by Time
        const rows = grouped[name].sort(
          (a, b) =>
            new Date(a.DateTime).getTime() - new Date(b.DateTime).getTime()
        );

        let totalHours = 0;
        let weekendHours = 0;
        let errors: string[] = [];
        let shifts: Shift[] = [];
        let i = 0;

        while (i < rows.length) {
          const inTimeStr = rows[i].DateTime;
          let matched = false;

          if (i + 1 < rows.length) {
            const outTimeStr = rows[i + 1].DateTime;
            const inTime = new Date(inTimeStr);
            const outTime = new Date(outTimeStr);

            // Simple heuristic: If next scan is within 16 hours, assume it's a shift.
            // Strict "Same Date" check might fail for overnight shifts, but user python code used strict same date.
            // We will stick to Same Date logic as per user's python script for consistency,
            // OR adapt if they want overnight. User's logic: "if                // Check for valid shift (allow overnight, max 24h)
            const diffMs = outTime.getTime() - inTime.getTime();
            const hours = diffMs / (1000 * 60 * 60);

            if (hours > 0 && hours < 24) {
              totalHours += hours;
              const day = inTime.getDay();
              const isWeekend = day === 0 || day === 6;
              if (isWeekend) {
                weekendHours += hours;
              }

              // Add Valid Shift
              shifts.push({
                id: `${name}-${i}`,
                date: inTimeStr.split(" ")[0],
                inTime: inTimeStr,
                outTime: outTimeStr,
                hours: parseFloat(hours.toFixed(2)),
                isWeekend: isWeekend,
                isValid: true,
              });

              matched = true;
              i += 2;
            } else {
              // Try to see if next one is better? Or just fail this pair.
              // If > 24h, likely missed punch or next day.
              matched = false;
            }
          }

          if (!matched) {
            // Determine if it looks like a missing OUT or just an error
            // Just log the time so user knows
            errors.push(`Lẻ/Thiếu cặp: ${rows[i].DateTime}`);

            // Add Invalid Shift
            shifts.push({
              id: `${name}-${i}-err`,
              date: rows[i].DateTime.split(" ")[0],
              inTime: rows[i].DateTime,
              outTime: "", // Missing
              hours: 0,
              isWeekend: false,
              isValid: false,
            });
            i += 1;
          }
        }

        summaries.push({
          Name: name,
          EnNo: rows[0]?.EnNo || "",
          TotalHours: parseFloat(totalHours.toFixed(2)),
          WeekendHours: parseFloat(weekendHours.toFixed(2)),
          SalaryPerHour: 0,
          TotalSalary: 0,
          Errors: errors,
          Shifts: shifts,
        });
      });

      setSummaryData(summaries);
    } catch (err) {
      console.error(err);
      setError("Có lỗi xảy ra khi xử lý file.");
    } finally {
      setLoading(false);
    }
  };

  const handleSalaryChange = (index: number, value: string) => {
    const newSummary = [...summaryData];
    const salary = parseFloat(value) || 0;
    newSummary[index].SalaryPerHour = salary;
    // Calculate total salary
    // Formula: (TotalHours) * Salary? Or (Normal + Weekend * Multiplier)?
    // User request: "tổng số giờ làm, tổng số giờ làm cuối tuần, tôi chỉ cần sửa lương của mỗi người là được"
    // Usually Weekend is x1.5 or x2, but user didn't specify. I will calculate simply: Total * Salary for now.
    // Or maybe they want to pay different rate for weekend?
    // I will assume single rate for now, but maybe highlight weekend.
    // Let's stick to simple: Total Salary = Total Hours * Rate.
    // If they want separate weekend pay, they can ask.
    // Total Salary = (Total Hours * Rate) + (Weekend Hours * 1000)
    const weekendHours = newSummary[index].WeekendHours;
    const total = newSummary[index].TotalHours * salary + weekendHours * 1000;
    newSummary[index].TotalSalary = Math.round(total / 1000) * 1000;
    setSummaryData(newSummary);
  };

  const handleSaveShifts = (updatedShifts: Shift[]) => {
    if (selectedEmpIndex === null) return;

    const newSummary = [...summaryData];
    const emp = newSummary[selectedEmpIndex];

    emp.Shifts = updatedShifts;

    let newTotal = 0;
    let newWeekend = 0;
    let newErrors: string[] = [];

    updatedShifts.forEach((s) => {
      if (s.isValid && s.hours > 0) {
        newTotal += s.hours;
        if (s.isWeekend) newWeekend += s.hours;
      } else {
        if (!s.isValid) {
          newErrors.push(`Lỗi/Thiếu: ${s.date} ${s.inTime || "?"}`);
        }
      }
    });

    emp.TotalHours = parseFloat(newTotal.toFixed(2));
    emp.WeekendHours = parseFloat(newWeekend.toFixed(2));
    emp.Errors = newErrors;

    const total = emp.TotalHours * emp.SalaryPerHour + emp.WeekendHours * 1000;
    emp.TotalSalary = Math.round(total / 1000) * 1000;

    setSummaryData(newSummary);
  };

  const openShiftModal = (index: number) => {
    const emp = filteredData[index];
    const realIndex = summaryData.findIndex((e) => e.EnNo === emp.EnNo);
    if (realIndex !== -1) {
      setSelectedEmpIndex(realIndex);
      setIsModalOpen(true);
    }
  };

  const exportToCSV = () => {
    // Export functionality
    const ws = XLSX.utils.json_to_sheet(
      summaryData.map((s) => ({
        "Tên Nhân Viên": s.Name,
        "Mã NV": s.EnNo,
        "Tổng Giờ": s.TotalHours,
        "Giờ Cuối Tuần": s.WeekendHours,
        "Lương/Giờ": s.SalaryPerHour,
        "Tổng Lương": s.TotalSalary,
        Lỗi: s.Errors.join("; "),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BangLuong");
    XLSX.writeFile(wb, "BangLuong.xlsx");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Tính Lương & Giờ Làm (Timesheet)
        </h1>
      </div>

      <Card className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white/50 backdrop-blur-sm shadow-xl border-t border-white/20">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            File Chấm Công (TXT)
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className={`p-2 border border-gray-300 rounded-md flex items-center gap-2 ${
                file ? "bg-blue-50 text-blue-700" : "bg-white text-gray-500"
              }`}
            >
              <FileText size={18} />
              <span className="truncate">
                {file ? file.name : "Chọn file..."}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Từ Ngày (00:00)
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Đến Ngày (23:59)
          </label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <Button
          onClick={processData}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105"
        >
          {loading ? (
            "Đang tính..."
          ) : (
            <>
              <Calculator className="mr-2 h-4 w-4" /> Tính Giờ Làm
            </>
          )}
        </Button>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
          {error}
        </div>
      )}

      {summaryData.length > 0 && (
        <Card className="p-6 shadow-xl border-t border-white/20 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Kết Quả Tính Lương
            </h2>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">🔍</span>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Tìm tên hoặc mã NV..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={exportToCSV}
                className="border-green-600 text-green-700 hover:bg-green-50 shrink-0"
              >
                <Save className="mr-2 h-4 w-4" /> Xuất Excel
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="max-h-[600px] overflow-y-auto relative">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 bg-gray-50">Mã NV</th>
                    <th className="px-6 py-3 bg-gray-50">Tên Nhân Viên</th>
                    <th className="px-6 py-3 text-right bg-gray-50">
                      Tổng Giờ Làm
                    </th>
                    <th className="px-6 py-3 text-right text-indigo-600 bg-gray-50">
                      Giờ Cuối Tuần
                    </th>
                    <th className="px-6 py-3 text-right w-40 bg-gray-50">
                      Lương/Giờ (VND)
                    </th>
                    <th className="px-6 py-3 text-right font-bold text-green-700 bg-gray-50">
                      Tổng Lương (Dự Tính)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((emp, index) => (
                    <tr
                      key={index}
                      className="bg-white border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium flex items-center">
                        <span
                          className="cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => openShiftModal(index)}
                        >
                          {emp.EnNo}
                        </span>
                        {emp.Errors.length > 0 && (
                          <span
                            className="cursor-pointer text-red-500 font-bold px-2 py-0.5 rounded-full bg-red-100 text-xs ml-2 animate-pulse"
                            onClick={(e) => {
                              e.stopPropagation();
                              openShiftModal(index);
                            }}
                            onMouseEnter={(e) => {
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setHoveredError({
                                x: rect.left + window.scrollX + 20,
                                y: rect.top + window.scrollY,
                                errors: emp.Errors,
                              });
                            }}
                            onMouseLeave={() => setHoveredError(null)}
                          >
                            !
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <span
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => openShiftModal(index)}
                        >
                          {emp.Name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          className="w-20 text-right border p-1 rounded font-mono focus:ring-2 focus:ring-blue-500"
                          value={emp.TotalHours}
                          onChange={(e) =>
                            handleHoursChange(
                              index,
                              "TotalHours",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          className="w-20 text-right border p-1 rounded font-mono text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                          value={emp.WeekendHours}
                          onChange={(e) =>
                            handleHoursChange(
                              index,
                              "WeekendHours",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          className="w-full p-1 text-right border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="0"
                          value={emp.SalaryPerHour || ""}
                          onChange={(e) =>
                            handleSalaryChange(index, e.target.value)
                          }
                        />
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-green-700 font-mono">
                        {emp.TotalSalary.toLocaleString("vi-VN")} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold text-gray-900 sticky bottom-0 z-10 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
                  <tr>
                    <td
                      colSpan={2}
                      className="px-6 py-3 text-center bg-gray-100"
                    >
                      Tổng Cộng
                    </td>
                    <td className="px-6 py-3 text-right bg-gray-100">
                      {filteredData
                        .reduce((acc, curr) => acc + curr.TotalHours, 0)
                        .toLocaleString("vi-VN")}
                    </td>
                    <td className="px-6 py-3 text-right bg-gray-100">
                      {filteredData
                        .reduce((acc, curr) => acc + curr.WeekendHours, 0)
                        .toLocaleString("vi-VN")}
                    </td>
                    <td className="bg-gray-100"></td>
                    <td className="px-6 py-3 text-right bg-gray-100">
                      {filteredData
                        .reduce((acc, curr) => acc + curr.TotalSalary, 0)
                        .toLocaleString("vi-VN")}{" "}
                      đ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Fixed Tooltip Portal */}
      {hoveredError && (
        <div
          className="fixed z-9999 bg-gray-800 text-white text-xs rounded shadow-lg p-3 max-w-xs pointer-events-none"
          style={{
            left: hoveredError.x,
            top: hoveredError.y,
            transform: "translateY(-50%)",
          }}
        >
          <p className="font-bold border-b border-gray-600 pb-1 mb-1 text-red-200">
            Cảnh báo thiếu cặp:
          </p>
          <div className="max-h-32 overflow-y-auto custom-scrollbar">
            {hoveredError.errors.map((e, idx) => (
              <div key={idx} className="mb-0.5">
                {e}
              </div>
            ))}
          </div>
          {/* Left Arrow */}
          <div className="absolute top-1/2 -translate-y-1/2 right-full w-0 h-0 border-y-4 border-r-4 border-y-transparent border-r-gray-800"></div>
        </div>
      )}
      {/* Modal */}
      {selectedEmpIndex !== null && summaryData[selectedEmpIndex] && (
        <ShiftDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveShifts}
          employeeName={summaryData[selectedEmpIndex].Name}
          employeeId={summaryData[selectedEmpIndex].EnNo}
          initialShifts={summaryData[selectedEmpIndex].Shifts || []}
        />
      )}
    </div>
  );
}
