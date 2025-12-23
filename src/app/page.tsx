"use client";

import { useState } from "react";
import { parseExcel } from "@/services/excel";
import { calculateCost, SaleRow } from "@/services/cost";
import InputMoney from "@/components/InputMoney";
import ResultTable from "@/components/ResultTable";

export default function HomePage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [salary, setSalary] = useState(0);
  const [electric, setElectric] = useState(0);
  const [other, setOther] = useState(0);
  const [revenue, setRevenue] = useState(0);

  async function handleFile(file: File) {
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

  const materialCost = rows.reduce((s, r) => s + r.cost, 0);

  return (
    <main className="p-8 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold">Tính % Cost tự động</h1>

      <input
        type="file"
        accept=".xls,.xlsx"
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />

      {rows.length > 0 && (
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Mã</th>
              <th className="border p-2">Tên</th>
              <th className="border p-2">Số bán</th>
              <th className="border p-2">Cost / đơn</th>
              <th className="border p-2">Tổng cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="border p-2">{r.product_code}</td>
                <td className="border p-2">{r.product_name}</td>
                <td className="border p-2 text-right">{r.quantity}</td>
                <td className="border p-2 text-right">
                  {r.costUnit.toLocaleString()}
                </td>
                <td className="border p-2 text-right">
                  {r.cost.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="grid grid-cols-4 gap-4">
        <InputMoney label="Doanh thu" set={setRevenue} />
        <InputMoney label="Lương" set={setSalary} />
        <InputMoney label="Điện nước" set={setElectric} />
        <InputMoney label="Chi phí khác" set={setOther} />
      </div>

      <ResultTable
        revenue={revenue}
        materialCost={materialCost}
        salary={salary}
        electric={electric}
        other={other}
      />
    </main>
  );
}
