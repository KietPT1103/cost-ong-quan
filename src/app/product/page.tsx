"use client";

import { useEffect, useState } from "react";
import {
  getAllProducts,
  upsertProductsFromExcel,
  updateProductCost,
  addProduct,
  deleteProduct,
  Product,
} from "@/services/products.firebase";
import { addCategory, Category, getCategories } from "@/services/categoryService";
import * as XLSX from "xlsx";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type NewProductState = {
  code: string;
  name: string;
  cost: number;
  price: number;
  category: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [costInput, setCostInput] = useState<number>(0);
  const [priceInput, setPriceInput] = useState<number>(0);
  const [categoryInput, setCategoryInput] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Add Product State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProductState>({
    code: "",
    name: "",
    cost: 0,
    price: 0,
    category: "",
  });

  async function loadProducts() {
    const data = await getAllProducts();
    setProducts(data);
  }

  async function loadCategories() {
    const data = await getCategories();
    setCategories(data);
  }

  useEffect(() => {
    async function init() {
      await Promise.all([loadProducts(), loadCategories()]);
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

  // SAVE COST & PRICE
  async function saveCost() {
    if (!editing) return;
    await updateProductCost(editing.product_code, {
      cost: costInput,
      price: priceInput,
      category: categoryInput,
    });
    setEditing(null);
    await loadProducts();
  }

  // ADD PRODUCT
  async function handleAddProduct() {
    if (!newProduct.code || !newProduct.name) {
      alert("Vui lòng nhập mã và tên sản phẩm");
      return;
    }

    try {
      await addProduct({
        product_code: newProduct.code,
        product_name: newProduct.name,
        cost: newProduct.cost,
        price: newProduct.price,
        category: newProduct.category,
        has_cost: true,
      });
      setShowAddModal(false);
      setNewProduct({ code: "", name: "", cost: 0, price: 0, category: "" });
      await loadProducts();
      alert("Thêm sản phẩm thành công");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi thêm sản phẩm");
    }
  }

  // DELETE PRODUCT
  async function handleDelete(code: string) {
    if (!confirm(`Bạn chắc chắn muốn xóa sản phẩm ${code}?`)) return;
    try {
      await deleteProduct(code);
      await loadProducts();
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi xóa sản phẩm");
    }
  }

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          title="Trở về trang chủ"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold">Quản lý nguyên liệu</h1>
      </div>

      {/* IMPORT */}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
        <input
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={(e) => e.target.files && handleImport(e.target.files[0])}
        />
        ⬆ Import danh sách nguyên liệu (Excel)
      </label>

      <button
        onClick={() => setShowAddModal(true)}
        className="inline-flex ml-4 items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Thêm sản phẩm
      </button>

      {/* TABLE */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Mã</th>
              <th className="px-4 py-3 text-left font-medium">Tên sản phẩm</th>
              <th className="px-4 py-3 text-right font-medium">Cost</th>
              <th className="px-4 py-3 text-right font-medium">Giá bán</th>
              <th className="px-4 py-3 text-left font-medium">Phân loại</th>
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
                      {p.cost.toLocaleString()}đ
                    </span>
                  ) : (
                    <span className="italic text-gray-400">Chưa có</span>
                  )}
                </td>

                <td className="px-4 py-3 text-right">
                  {p.price ? (
                    <span className="font-medium">
                      {p.price.toLocaleString()}đ
                    </span>
                  ) : (
                    <span className="italic text-gray-400">Chưa có</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  {(() => {
                    const label =
                      categories.find(
                        (c) => c.id === p.category || c.name === p.category
                      )?.name || p.category;
                    if (!label) {
                      return (
                        <span className="italic text-gray-400">
                          Chưa phân loại
                        </span>
                      );
                    }
                    return label;
                  })()}
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
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditing(p);
                        setCostInput(p.cost ?? 0);
                        setPriceInput(p.price ?? 0);
                        setCategoryInput(p.category ?? "");
                      }}
                      className="rounded-md border border-blue-600 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(p.product_code)}
                      className="rounded-md border border-red-600 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg animate-in fade-in zoom-in">
            {/* HEADER */}
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Chỉnh giá nguyên liệu</h2>
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
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Giá bán
                </label>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Nhập giá bán"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phân loại
                </label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Chọn loại sản phẩm --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Loại mới"
                  />
                  <button
                    onClick={async () => {
                      const id = await addCategory(newCategoryName);
                      if (id) {
                        await loadCategories();
                        setCategoryInput(newCategoryName);
                        setNewCategoryName("");
                      }
                    }}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Lưu loại mới
                  </button>
                </div>
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

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg animate-in fade-in zoom-in">
            {/* HEADER */}
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Thêm sản phẩm mới</h2>
            </div>

            {/* BODY */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mã sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProduct.code}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, code: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="VD: SP001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="VD: Cà phê sữa"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cost / đơn vị
                  </label>
                  <input
                    type="number"
                    value={newProduct.cost}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        cost: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Giá bán
                  </label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        price: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phân loại
                </label>
                <select
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Chọn loại sản phẩm --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Loại mới"
                  />
                  <button
                    onClick={async () => {
                      const id = await addCategory(newCategoryName);
                      if (id) {
                        await loadCategories();
                        setNewProduct({
                          ...newProduct,
                          category: newCategoryName,
                        });
                        setNewCategoryName("");
                      }
                    }}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Lưu loại mới
                  </button>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleAddProduct}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
