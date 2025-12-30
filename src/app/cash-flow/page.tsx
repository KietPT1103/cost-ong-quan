"use client";

import { useEffect, useState, useMemo } from "react";
import { getReports, Report } from "@/services/reportService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { ArrowLeft, BarChart3, Printer, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";

import RoleGuard from "@/components/RoleGuard";

export default function CashFlowPage() {
  const { storeId } = useStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  type PrintScope =
    | "ALL"
    | "CUSTOM"
    | "Q1"
    | "Q2"
    | "Q3"
    | "Q4"
    | "M1"
    | "M2"
    | "M3"
    | "M4"
    | "M5"
    | "M6"
    | "M7"
    | "M8"
    | "M9"
    | "M10"
    | "M11"
    | "M12";

  // Print State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printScope, setPrintScope] = useState<PrintScope>("ALL");
  const printDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Custom Date Range State
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Initialize custom dates when year changes
  useEffect(() => {
    setCustomStartDate(`${year}-01-01`);
    setCustomEndDate(`${year}-12-31`);
  }, [year]);

  // Load data for the selected year
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const startDate = new Date(year, 0, 1); // Jan 1st
        const endDate = new Date(year, 11, 31, 23, 59, 59); // Dec 31st
        // Fetch up to 1000 reports for the year to ensure we cover enough data for stats
        const data = await getReports(1000, startDate, endDate, storeId);
        setReports(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year, storeId]);

  // Aggregation Logic
  const stats = useMemo(() => {
    const quarters = [
      { id: 1, label: "Quý 1 (T1-T3)", revenue: 0, cost: 0, profit: 0 },
      { id: 2, label: "Quý 2 (T4-T6)", revenue: 0, cost: 0, profit: 0 },
      { id: 3, label: "Quý 3 (T7-T9)", revenue: 0, cost: 0, profit: 0 },
      { id: 4, label: "Quý 4 (T10-T12)", revenue: 0, cost: 0, profit: 0 },
    ];

    const months = Array.from({ length: 12 }, (_, idx) => ({
      id: idx + 1,
      label: `Tháng ${idx + 1}`,
      revenue: 0,
      cost: 0,
      profit: 0,
    }));

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    reports.forEach((r) => {
      if (!r.createdAt?.seconds) return;
      const date = new Date(r.createdAt.seconds * 1000);
      const month = date.getMonth(); // 0-11
      const quarterIndex = Math.floor(month / 3);

      const isCustomScope = printScope === "CUSTOM";
      const isMonthScope = printScope.startsWith("M");
      const isQuarterScope = printScope.startsWith("Q");

      // Filter cho phạm vi được chọn
      if (isCustomScope) {
        const rDate = date.toISOString().split("T")[0];
        if (customStartDate && rDate < customStartDate) return;
        if (customEndDate && rDate > customEndDate) return;
      } else if (isMonthScope) {
        const targetMonth = Number(printScope.replace("M", "")) - 1;
        if (month !== targetMonth) return;
      } else if (isQuarterScope) {
        const targetQuarter = Number(printScope.replace("Q", "")) - 1;
        if (quarterIndex !== targetQuarter) return;
      }

      totalRevenue += r.revenue;
      totalCost += r.totalCost;
      totalProfit += r.profit;

      quarters[quarterIndex].revenue += r.revenue;
      quarters[quarterIndex].cost += r.totalCost;
      quarters[quarterIndex].profit += r.profit;

      months[month].revenue += r.revenue;
      months[month].cost += r.totalCost;
      months[month].profit += r.profit;
    });

    return { totalRevenue, totalCost, totalProfit, quarters, months };
  }, [reports, printScope, customStartDate, customEndDate]);

  const StatCard = ({
    title,
    revenue,
    cost,
    profit,
    highlight,
  }: {
    title: string;
    revenue: number;
    cost: number;
    profit: number;
    highlight?: boolean;
  }) => (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm p-6 print:border-gray-300 print:shadow-none",
        highlight && "border-blue-200 bg-blue-50/50 print:bg-gray-50"
      )}
    >
      <h3 className="font-semibold leading-none tracking-tight mb-4 text-lg">
        {title}
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground print:text-gray-600">
            Doanh thu:
          </span>
          <span className="font-medium">{revenue.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground print:text-gray-600">
            Chi phí:
          </span>
          <span className="font-medium text-red-600">
            {cost.toLocaleString()}
          </span>
        </div>
        <div className="pt-2 border-t mt-2 flex justify-between font-bold text-base">
          <span>Lợi nhuận:</span>
          <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>
            {profit.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );

  const handlePrint = () => {
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div
        className={cn(
          "min-h-screen bg-gray-50 font-sans text-slate-800 print:bg-white",
          `print-scope-${printScope}`
        )}
      >
        {/* Global Print Styles */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              background: white;
              -webkit-print-color-adjust: exact;
            }
            .no-print {
              display: none !important;
            }

            /* Adjust grid for print */
            .grid {
              display: block !important;
            }
            .grid > div {
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
          }
        `}</style>

        {/* Print Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-600" />
                  Tùy chọn in ấn
                </h3>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Chọn thời gian báo cáo:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPrintScope("ALL")}
                      className={cn(
                        "p-2 text-sm border rounded flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors",
                        printScope === "ALL"
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-600"
                      )}
                    >
                      {printScope === "ALL" && <Check className="w-3 h-3" />} Cả
                      năm
                    </button>
                    <button
                      onClick={() => setPrintScope("CUSTOM")}
                      className={cn(
                        "p-2 text-sm border rounded flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors",
                        printScope === "CUSTOM"
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-600"
                      )}
                    >
                      {printScope === "CUSTOM" && <Check className="w-3 h-3" />}
                      Tùy chọn
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {Array.from({ length: 12 }, (_, idx) => idx + 1).map(
                      (month) => (
                        <button
                          key={month}
                          onClick={() =>
                            setPrintScope(`M${month}` as PrintScope)
                          }
                          className={cn(
                            "p-2 text-sm border rounded flex items-center justify-center gap-1 hover:bg-blue-50 transition-colors",
                            printScope === `M${month}`
                              ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                              : "text-gray-600"
                          )}
                        >
                          {printScope === `M${month}` && (
                            <Check className="w-3 h-3" />
                          )}{" "}
                          Tháng {month}
                        </button>
                      )
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[1, 2, 3, 4].map((q) => (
                      <button
                        key={q}
                        onClick={() => setPrintScope(`Q${q}` as PrintScope)}
                        className={cn(
                          "p-2 text-sm border rounded flex items-center justify-center gap-1 hover:bg-blue-50 transition-colors",
                          printScope === `Q${q}`
                            ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-600"
                        )}
                      >
                        {printScope === `Q${q}` && (
                          <Check className="w-3 h-3" />
                        )}{" "}
                        Q{q}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Từ ngày
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          setPrintScope("CUSTOM");
                          setCustomStartDate(e.target.value);
                        }}
                        className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Đến ngày
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          setPrintScope("CUSTOM");
                          setCustomEndDate(e.target.value);
                        }}
                        className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowPrintModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2"
                >
                  <Printer className="w-4 h-4" /> In ngay
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 rounded-full hover:bg-white bg-white/50 transition-colors text-gray-600 shadow-sm"
                title="Trở về trang chủ"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                  Thống kê dòng tiền
                </h1>
                <p className="text-muted-foreground">
                  Tổng hợp tình hình kinh doanh theo thời gian
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex gap-2 bg-white"
                onClick={() => setShowPrintModal(true)}
              >
                <Printer className="w-4 h-4" />
                In báo cáo
              </Button>

              <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                <button
                  onClick={() => setYear(year - 1)}
                  className="px-3 py-1 hover:bg-gray-100 rounded text-sm"
                >
                  ←
                </button>
                <span className="font-bold px-2">Năm {year}</span>
                <button
                  onClick={() => setYear(year + 1)}
                  className="px-3 py-1 hover:bg-gray-100 rounded text-sm"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* Print Header (Visible only when printing) */}
          <div className="hidden print:block mb-8 text-center border-b pb-4">
            <h1 className="text-2xl font-bold text-black uppercase">
              Báo cáo Dòng Tiền - Năm {year}
            </h1>
            <p className="text-gray-600 mt-1">
              {printScope === "ALL" && "Báo cáo tổng hợp cả năm"}
              {printScope.startsWith("M") &&
                `Báo cáo Tháng ${printScope.substring(1)}`}
              {printScope.startsWith("Q") &&
                `Báo cáo Quý ${printScope.substring(1)}`}
              {printScope === "CUSTOM" &&
                `Báo cáo từ ${new Date(customStartDate).toLocaleDateString(
                  "vi-VN"
                )} đến ${new Date(customEndDate).toLocaleDateString("vi-VN")}`}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Ngày in: {new Date(printDate).toLocaleDateString("vi-VN")}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Đang tải dữ liệu...
            </div>
          ) : (
            <div className="space-y-10">
              {/* ANNUAL SUMMARY */}
              <section className="print-section" data-id="annual">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="w-2 h-8 bg-blue-600 rounded-full print:hidden"></span>
                  {printScope === "ALL"
                    ? `Tổng kết năm ${year}`
                    : "Tổng kết theo phạm vi chọn"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="print:border-0 print:shadow-none print:bg-transparent">
                    <CardHeader className="pb-2 print:p-0">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Tổng doanh thu
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="print:p-0">
                      <div className="text-2xl font-bold text-blue-600">
                        {stats.totalRevenue.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="print:border-0 print:shadow-none print:bg-transparent">
                    <CardHeader className="pb-2 print:p-0">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Tổng chi phí
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="print:p-0">
                      <div className="text-2xl font-bold text-red-600">
                        {stats.totalCost.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="print:border-0 print:shadow-none print:bg-transparent">
                    <CardHeader className="pb-2 print:p-0">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Lợi nhuận ròng
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="print:p-0">
                      <div
                        className={cn(
                          "text-2xl font-bold",
                          stats.totalProfit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {stats.totalProfit.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* MONTHLY */}
              <section
                className={cn(
                  "print-section",
                  printScope === "ALL" || printScope.startsWith("M")
                    ? ""
                    : "print:hidden",
                  printScope === "CUSTOM" && "hidden"
                )}
                data-id="monthly"
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="w-2 h-8 bg-purple-500 rounded-full print:hidden"></span>
                  Báo cáo theo Tháng
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.months.map((m, idx) => (
                    <div
                      key={m.id}
                      className={cn(
                        printScope === "ALL" || printScope === `M${idx + 1}`
                          ? "block"
                          : "print:hidden"
                      )}
                    >
                      <StatCard
                        title={m.label}
                        revenue={m.revenue}
                        cost={m.cost}
                        profit={m.profit}
                        highlight={printScope === `M${idx + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* QUARTERLY */}
              <section
                className={cn(
                  "print-section",
                  printScope === "ALL" || printScope.startsWith("Q")
                    ? ""
                    : "print:hidden",
                  // Hide detailed sections in CUSTOM mode
                  printScope === "CUSTOM" && "hidden"
                )}
                data-id={printScope}
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="w-2 h-8 bg-emerald-500 rounded-full print:hidden"></span>
                  Báo cáo theo Quý
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.quarters.map((q, idx) => (
                    <div
                      key={q.id}
                      className={cn(
                        printScope === "ALL" || printScope === `Q${idx + 1}`
                          ? "block"
                          : "print:hidden"
                      )}
                    >
                      <StatCard
                        title={q.label}
                        revenue={q.revenue}
                        cost={q.cost}
                        profit={q.profit}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
