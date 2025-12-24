"use client";

import { useState } from "react";
import { parseExcel } from "@/services/excel";
import { calculateCost, SaleRow } from "@/services/cost";
import InputMoney from "@/components/InputMoney";
import ResultTable from "@/components/ResultTable";
import Link from "next/link";
import { Upload, FileSpreadsheet, Calculator, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";

export default function HomePage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [salary, setSalary] = useState(0);
  const [electric, setElectric] = useState(0);
  const [other, setOther] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [fileName, setFileName] = useState<string>("");

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

    const { detail } = calculateCost(mapped);
    setRows(detail);
  }

  // Calculate values for display only
  const materialCost = rows.reduce((s, r) => s + r.cost, 0);

  return (
    <main className="min-h-screen bg-background p-6 md:p-12 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <Calculator className="w-8 h-8" />
              Cost Calculator
            </h1>
            <p className="text-muted-foreground mt-1">
              Tính toán chi phí và lợi nhuận tự động từ file Excel bán hàng.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/product">
              <Button variant="outline" className="gap-2">
                <Package className="w-4 h-4" />
                Quản lý sản phẩm
              </Button>
            </Link>
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
          </div>
        </div>
      </div>
    </main>
  );
}
