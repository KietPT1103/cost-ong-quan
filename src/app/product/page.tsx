"use client";

import { useEffect, useState } from "react";
import {
  getAllProducts,
  upsertProductsFromExcel,
  updateProductCost,
  Product,
} from "@/services/products.firebase";
import * as XLSX from "xlsx";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [costInput, setCostInput] = useState<number>(0);

  async function loadProducts() {
    const data = await getAllProducts();
    setProducts(data);
  }

  useEffect(() => {
    async function init() {
      const data = await getAllProducts();
      setProducts(data);
    }

    init();
  }, []);

  // IMPORT EXCEL NGUYÊN LIỆU
  async function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      // tìm header
      const headerIndex = rows.findIndex(
        (r) => r?.includes("Mã hàng") && r?.includes("Tên hàng hóa")
      );

      if (headerIndex === -1) {
        alert("Không tìm thấy header Excel");
        return;
      }

      const dataRows = rows.slice(headerIndex + 1);

      const mapped = dataRows
        .filter((r) => typeof r[0] === "string")
        .map((r) => ({
          product_code: String(r[0]),
          product_name: String(r[1]),
        }));

      await upsertProductsFromExcel(mapped);
      await loadProducts();
      alert("Import nguyên liệu thành công");
    };

    reader.readAsArrayBuffer(file);
  }

  // SAVE COST
  async function saveCost() {
    if (!editing) return;
    await updateProductCost(editing.product_code, costInput);
    setEditing(null);
    await loadProducts();
  }

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Quản lý nguyên liệu</h1>

      {/* IMPORT */}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
        <input
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={(e) => e.target.files && handleImport(e.target.files[0])}
        />
        📄 Import danh sách nguyên liệu (Excel)
      </label>

      {/* TABLE */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Mã</th>
              <th className="px-4 py-3 text-left font-medium">
                Tên nguyên liệu
              </th>
              <th className="px-4 py-3 text-right font-medium">Cost</th>
              <th className="px-4 py-3 text-center font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-center font-medium">Hành động</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.product_code} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-mono">{p.product_code}</td>

                <td className="px-4 py-3">{p.product_name}</td>

                <td className="px-4 py-3 text-right">
                  {p.cost ? (
                    <span className="font-medium">
                      {p.cost.toLocaleString()}
                    </span>
                  ) : (
                    <span className="italic text-gray-400">—</span>
                  )}
                </td>

                <td className="px-4 py-3 text-center">
                  {p.has_cost ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      Đã có cost
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                      Chưa có cost
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setCostInput(p.cost ?? 0);
                    }}
                    className="rounded-md border border-blue-600 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
                  >
                    Sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg animate-in fade-in zoom-in">
            {/* HEADER */}
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Chỉnh cost nguyên liệu</h2>
              <p className="text-sm text-gray-500">
                {editing.product_name} ({editing.product_code})
              </p>
            </div>

            {/* BODY */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cost / đơn vị
                </label>
                <input
                  type="number"
                  value={costInput}
                  onChange={(e) => setCostInput(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Nhập cost"
                />
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button
                onClick={() => setEditing(null)}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={saveCost}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
