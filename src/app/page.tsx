"use client";

import { useState, useEffect } from "react";
import { parseExcel } from "@/services/excel";
import { calculateCost, SaleRow } from "@/services/cost";
import InputMoney from "@/components/InputMoney";
import ResultTable from "@/components/ResultTable";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  Calculator,
  Package,
  Coffee,
  LogOut,
  Wallet,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fetchProductCosts, seedProductCosts } from "@/services/productService";
import { migrateOldProducts } from "@/services/products.firebase";
import { saveReport } from "@/services/reportService";
import {
  FileText,
  Save,
  BarChart3,
  ReceiptText,
  RefreshCw,
  CalendarDays,
  Filter
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useStore } from "@/context/StoreContext";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { user, role, loading, logout } = useAuth();
  const { storeId, storeName, setStoreId } = useStore();
  const router = useRouter();
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [salary, setSalary] = useState(0);
  const [electric, setElectric] = useState(0);
  const [other, setOther] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [fileName, setFileName] = useState<string>("");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [includeInCashFlow, setIncludeInCashFlow] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (role === "user") {
        router.push("/pos");
      }
    }
  }, [user, role, loading, router]);

  if (loading || !user || role === "user") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  async function handleFile(file: File) {
    if (!file) return;
    setFileName(file.name);
    const rows = await parseExcel(file);

    const headerIndex = rows.findIndex(
      (row) => row?.includes("Mã hàng") && row?.includes("SL bán")
    );

    if (headerIndex === -1) {
      alert("Không tìm thấy header bảng dữ liệu");
      return;
    }

    const dataRows = rows.slice(headerIndex + 1);

    const mapped = dataRows
      .filter((r) => typeof r[1] === "string" && !r[1].includes("SL mặt hàng"))
      .map((r) => ({
        product_code: String(r[1]),
        product_name: String(r[2]),
        quantity: Number(r[5] ?? 0),
      }));

    const costMap = await fetchProductCosts(storeId);
    const { detail } = calculateCost(mapped, costMap);
    setRows(detail);
  }

  // Calculate values for display only
  const materialCost = rows.reduce((s, r) => s + r.cost, 0);

  const handleSeed = async () => {
    if (
      confirm("Bạn có chắc muốn upload dữ liệu từ config lên Firebase không?")
    ) {
      await seedProductCosts();
      alert("Đã upload dữ liệu cost lên Firebase thành công!");
    }
  };

  const handleSaveReport = async () => {
    if (!fileName || rows.length === 0) {
      alert("Chưa có dữ liệu để lưu");
      return;
    }

    if (!revenue) {
      if (!confirm("Chưa nhập doanh thu. Bạn có muốn tiếp tục lưu?")) return;
    }

    try {
      const materialCost = rows.reduce((s, r) => s + r.cost, 0);
      const totalCost = materialCost + salary + electric + other;
      const profit = revenue - totalCost;

      await saveReport({
        fileName,
        revenue,
        salary,
        electric,
        other,
        totalMaterialCost: materialCost,
        totalCost,
        profit,
        storeId,
        createdAt: reportEndDate ? new Date(reportEndDate) : new Date(),
        startDate: reportStartDate ? new Date(reportStartDate) : undefined,
        endDate: reportEndDate ? new Date(reportEndDate) : undefined,
        includeInCashFlow,
        details: rows.map((r) => ({
          product_code: r.product_code,
          product_name: r.product_name,
          quantity: r.quantity,
          costUnit: r.costUnit,
          cost: r.cost,
        })),
      });

      alert("Đã lưu báo cáo thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi lưu báo cáo");
    }
  };

  const navItems = [
    { href: "/pos", label: "Bán hàng", icon: Coffee, color: "text-sky-600", bg: "bg-sky-50" },
    { href: "/reports", label: "Báo cáo", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
    { href: "/cash-flow", label: "Dòng tiền", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
    { href: "/bills", label: "Hóa đơn", icon: ReceiptText, color: "text-orange-600", bg: "bg-orange-50" },
    { href: "/product", label: "Sản phẩm", icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { href: "/payroll", label: "Tính lương", icon: Wallet, color: "text-pink-600", bg: "bg-pink-50" },
  ];

  // Helper to set dates quickly
  const setQuickDate = (type: 'this_month' | 'last_month') => {
    const now = new Date();
    let start, end;

    if (type === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    setReportStartDate(start.toISOString().split('T')[0]);
    setReportEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
             {/* Decorative Background Shape */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <h1 className="text-3xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm">
                <Calculator className="w-8 h-8" />
              </div>
              Admin Dashboard
            </h1>
            <div className="flex items-center gap-3 mt-3">
                 <p className="text-slate-500 font-medium text-sm">Quản lý cửa hàng:</p>
                 <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {storeName}
                 </span>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row items-center gap-4 relative z-10 w-full xl:w-auto mt-6 xl:mt-0">
            <div className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60 backdrop-blur-sm w-full xl:w-auto overflow-x-auto">
              <div className="flex flex-wrap xl:flex-nowrap items-center gap-1 min-w-max mx-auto justify-center xl:justify-start">
                 {navItems.map((item) => (
                     <Link href={item.href} key={item.href}>
                         <Button 
                            variant="ghost" 
                            className={cn(
                              "h-10 px-4 rounded-xl gap-2.5 font-semibold text-sm transition-all border border-transparent",
                              "text-slate-600 hover:text-slate-900",
                              "hover:bg-white hover:shadow-sm hover:border-slate-100/50 hover:scale-105"
                            )}
                         >
                            <item.icon className={cn("w-4 h-4 opacity-70 group-hover:opacity-100", item.color)} />
                            <span>{item.label}</span>
                         </Button>
                     </Link>
                 ))}
              </div>
            </div>

            <div className="hidden xl:block w-px h-8 bg-slate-200"></div>

            <Button
              variant="ghost"
              onClick={logout}
              className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-5 rounded-xl font-bold h-10 w-full xl:w-auto whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </Button>
          </div>
        </div>

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* LEFT COLUMN: Main Operation */}
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Navigation Cards (Mobile/Tablet Friendly) */}
                 <Link href="/pos" className="block md:hidden">
                    <Card className="hover:shadow-md transition-all border-l-4 border-l-sky-500 cursor-pointer h-full">
                        <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-base font-bold text-sky-700">Vào trang Bán hàng</CardTitle>
                            <Coffee className="w-5 h-5 text-sky-500" />
                        </CardHeader>
                    </Card>
                 </Link>
                 <Link href="/reports" className="block md:hidden">
                    <Card className="hover:shadow-md transition-all border-l-4 border-l-emerald-500 cursor-pointer h-full">
                        <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-base font-bold text-emerald-700">Xem Báo cáo</CardTitle>
                            <FileText className="w-5 h-5 text-emerald-500" />
                        </CardHeader>
                    </Card>
                 </Link>
            </div>

            {/* Upload Card */}
            <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded text-emerald-600">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  Nhập dữ liệu bán hàng
                </CardTitle>
                <CardDescription>
                  Upload file Excel xuất từ phần mềm bán hàng (.xls, .xlsx)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:bg-slate-50 transition-colors relative group cursor-pointer bg-slate-50/30">
                  <input
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={(e) =>
                      e.target.files && handleFile(e.target.files[0])
                    }
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div className="flex flex-col items-center gap-3 pointer-events-none relative z-10">
                    <div className="p-4 bg-white rounded-full text-emerald-600 shadow-sm ring-1 ring-emerald-100 group-hover:scale-110 transition-transform duration-300">
                      <Upload className="w-8 h-8" />
                    </div>
                    {fileName ? (
                      <div className="animate-in fade-in zoom-in duration-300">
                        <p className="font-bold text-emerald-700 text-lg">
                          {fileName}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          Nhấn để thay đổi file khác
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-slate-700 text-lg">
                          Kéo thả hoặc nhấn để chọn file
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          Hỗ trợ định dạng Excel tiêu chuẩn
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Table */}
            {rows.length > 0 && (
              <Card className="border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                  <div className="flex items-center justify-between">
                     <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-primary" />
                        Chi tiết đơn hàng
                     </CardTitle>
                     <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                        {rows.length} sản phẩm
                     </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10 shadow-sm font-code">
                        <tr>
                          <th className="px-6 py-4 text-left font-semibold text-slate-600 border-b">
                            Mã hàng
                          </th>
                          <th className="px-6 py-4 text-left font-semibold text-slate-600 border-b">
                            Tên sản phẩm
                          </th>
                          <th className="px-6 py-4 text-right font-semibold text-slate-600 border-b">
                            Số lượng
                          </th>
                          <th className="px-6 py-4 text-right font-semibold text-slate-600 border-b">
                            Cost/đơn
                          </th>
                          <th className="px-6 py-4 text-right font-semibold text-slate-600 border-b">
                            Tổng Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((r, i) => (
                          <tr
                            key={i}
                            className="hover:bg-blue-50/50 transition-colors group"
                          >
                            <td className="px-6 py-3.5 font-mono text-xs text-slate-500 group-hover:text-blue-600 font-medium">
                              {r.product_code}
                            </td>
                            <td className="px-6 py-3.5 font-medium text-slate-700">{r.product_name}</td>
                            <td className="px-6 py-3.5 text-right font-bold text-slate-600 bg-slate-50/50">
                              {r.quantity}
                            </td>
                            <td className="px-6 py-3.5 text-right text-slate-500 tabular-nums">
                              {r.costUnit.toLocaleString()}
                            </td>
                            <td className="px-6 py-3.5 text-right font-bold text-rose-600 tabular-nums">
                              {r.cost.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN: Cost Inputs & Result */}
          <div className="space-y-6">
            {/* Cost Configuration */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 ring-1 ring-slate-200 h-fit sticky top-6">
              <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
                <CardTitle className="text-primary flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Chi phí vận hành
                </CardTitle>
                <CardDescription>
                  Nhập các chi phí thực tế trong tháng để tính lãi lỗ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 block">
                    1. Cấu hình thời gian
                  </label>
                  <div className="flex gap-2 mb-3">
                     <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setQuickDate('this_month')}
                        className="text-xs h-7 px-2 border-slate-200 text-slate-600 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all font-medium"
                     >
                        Tháng này
                     </Button>
                     <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setQuickDate('last_month')}
                        className="text-xs h-7 px-2 border-slate-200 text-slate-600 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all font-medium"
                     >
                        Tháng trước
                     </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <span className="text-xs text-slate-500 font-medium ml-1 flex items-center gap-1">
                            Từ ngày
                        </span>
                        <div className="relative">
                            <input
                                type="date"
                                className="flex w-full rounded-lg border border-slate-200 bg-white pl-3 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                value={reportStartDate}
                                onChange={(e) => setReportStartDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                         <span className="text-xs text-slate-500 font-medium ml-1 flex items-center gap-1">
                            Đến ngày
                        </span>
                        <div className="relative">
                            <input
                                type="date"
                                className="flex w-full rounded-lg border border-slate-200 bg-white pl-3 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                value={reportEndDate}
                                onChange={(e) => setReportEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/50 mt-2">
                    <input
                        type="checkbox"
                        id="includeInCashFlow"
                        checked={includeInCashFlow}
                        onChange={(e) => setIncludeInCashFlow(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <label
                        htmlFor="includeInCashFlow"
                        className="text-sm font-medium leading-none cursor-pointer select-none text-slate-700"
                    >
                        Tính vào tổng dòng tiền
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                     <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">
                        2. Nhập liệu tài chính
                    </label>
                    <InputMoney label="Doanh thu tổng (VNĐ)" set={setRevenue} value={revenue} className="text-lg font-bold text-primary" />
                    <div className="h-px bg-slate-100 my-2"></div>
                    <div className="space-y-3">
                        <InputMoney label="Lương nhân viên" set={setSalary} value={salary} />
                        <InputMoney label="Điện / Nước / Net" set={setElectric} value={electric} />
                        <InputMoney label="Chi phí khác" set={setOther} value={other} />
                    </div>
                </div>
              </CardContent>

              <div className="p-6 pt-0">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
                        <ResultTable
                        revenue={revenue}
                        materialCost={materialCost}
                        salary={salary}
                        electric={electric}
                        other={other}
                        />
                  </div>

                <Button
                    onClick={handleSaveReport}
                    className="w-full h-12 gap-2 bg-cta hover:bg-orange-600 text-white shadow-lg shadow-orange-200 rounded-xl text-lg font-bold transition-all hover:-translate-y-1"
                >
                    <Save className="w-5 h-5" />
                    Lưu Báo Cáo
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
