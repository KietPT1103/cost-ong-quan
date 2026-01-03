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
  const [reportMonth, setReportMonth] = useState("");

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
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
        createdAt: reportMonth ? new Date(reportMonth) : undefined,
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

  // const handleMigrate = async () => {
  //   if (
  //     !confirm(
  //       "Thao tác này sẽ gán tất cả sản phẩm cũ (chưa có cửa hàng) vào cửa hàng [Cafe]. Bạn có chắc chắn không?"
  //     )
  //   )
  //     return;

  //   try {
  //     const count = await migrateOldProducts("cafe");
  //     alert(`Đã cập nhật thành công ${count} sản phẩm cũ vào Cafe!`);
  //   } catch (error) {
  //     console.error(error);
  //     alert("Lỗi khi cập nhật dữ liệu.");
  //   }
  // };

  return (
    <main className="min-h-screen bg-background p-6 md:p-12 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Calculator className="w-8 h-8" />
              </div>
              Admin Dashboard
            </h1>
            <p className="flex items-center gap-2 text-slate-500 mt-2 text-sm font-medium">
              Bạn đang quản lý:
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                {storeName}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/pos">
              <Button className="gap-2 bg-sky-600 hover:bg-sky-700 text-white border-none shadow-sm hover:shadow-md transition-all">
                <Coffee className="w-4 h-4" />
                Bán hàng
              </Button>
            </Link>

            <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block"></div>

            <Link href="/reports">
              <Button
                variant="outline"
                className="gap-2 hover:bg-slate-50 border-slate-200 text-slate-700"
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                Báo cáo
              </Button>
            </Link>
            <Link href="/cash-flow">
              <Button
                variant="outline"
                className="gap-2 hover:bg-slate-50 border-slate-200 text-slate-700"
              >
                <BarChart3 className="w-4 h-4 text-purple-600" />
                Dòng tiền
              </Button>
            </Link>
            <Link href="/bills">
              <Button
                variant="outline"
                className="gap-2 hover:bg-slate-50 border-slate-200 text-slate-700"
              >
                <ReceiptText className="w-4 h-4 text-orange-600" />
                Hóa đơn
              </Button>
            </Link>
            <Link href="/product">
              <Button
                variant="outline"
                className="gap-2 hover:bg-slate-50 border-slate-200 text-slate-700"
              >
                <Package className="w-4 h-4 text-blue-600" />
                Sản phẩm
              </Button>
            </Link>

            {/* <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block"></div>

            <Button
              variant="ghost"
              onClick={handleMigrate}
              className="gap-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              title="Cập nhật dữ liệu cũ"
            >
              <RefreshCw className="w-4 h-4" />
            </Button> */}

            <Button
              variant="ghost"
              onClick={logout}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN: Input & Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Nhập dữ liệu bán hàng
                </CardTitle>
                <CardDescription>
                  Upload file Excel xuất từ phần mềm bán hàng (.xls, .xlsx)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors relative">
                  <input
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={(e) =>
                      e.target.files && handleFile(e.target.files[0])
                    }
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                      <Upload className="w-6 h-6" />
                    </div>
                    {fileName ? (
                      <div>
                        <p className="font-semibold text-emerald-700">
                          {fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Nhấn để thay đổi file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">
                          Kéo thả hoặc nhấn để chọn file
                        </p>
                        <p className="text-xs text-muted-foreground">
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
              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết đơn hàng ({rows.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                  <div className="max-h-[500px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground border-b">
                            Mã hàng
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground border-b">
                            Tên sản phẩm
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground border-b">
                            Số lượng
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground border-b">
                            Cost/đơn
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground border-b">
                            Tổng Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((r, i) => (
                          <tr
                            key={i}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-xs">
                              {r.product_code}
                            </td>
                            <td className="px-4 py-3">{r.product_name}</td>
                            <td className="px-4 py-3 text-right font-medium">
                              {r.quantity}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {r.costUnit.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
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
            <Card>
              <CardHeader>
                <CardTitle>Chi phí vận hành</CardTitle>
                <CardDescription>
                  Nhập các chi phí thực tế trong tháng
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block text-slate-700">
                    Tháng báo cáo (Tuỳ chọn)
                  </label>
                  <input
                    type="month"
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nếu để trống sẽ lấy thời gian hiện tại
                  </p>
                </div>
                <InputMoney label="Doanh thu tổng (VNĐ)" set={setRevenue} />
                <div className="border-t my-2"></div>
                <InputMoney label="Lương nhân viên" set={setSalary} />
                <InputMoney label="Điện / Nước / Net" set={setElectric} />
                <InputMoney label="Chi phí khác" set={setOther} />
              </CardContent>
            </Card>

            {/* Final Result */}
            <ResultTable
              revenue={revenue}
              materialCost={materialCost}
              salary={salary}
              electric={electric}
              other={other}
            />

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleSaveReport}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4" />
                Lưu báo cáo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
