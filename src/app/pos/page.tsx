"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coffee,
  CreditCard,
  LayoutGrid,
  Minus,
  NotebookTabs,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveBill } from "@/services/billService";
import { getAllProducts, Product } from "@/services/products.firebase";
import { addTable, CafeTable, getTables } from "@/services/tableService";
import { Category, getCategories } from "@/services/categoryService";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";

const ALL_CATEGORY = "Tất cả";
const ALL_CATEGORY_ID = "ALL";
const TAKEAWAY_ID = "__takeaway";
const TAKEAWAY_NAME = "Mang về";
const TABLES_PER_PAGE = 20;

const formatCurrency = (value: number) =>
  value.toLocaleString("vi-VN", { minimumFractionDigits: 0 });

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
};

type CartItem = MenuItem & { quantity: number };
type ReceiptData = {
  table: string;
  note?: string;
  items: CartItem[];
  total: number;
  time: string;
};

export default function CafePosPage() {
  const { role, logout } = useAuth();
  const { storeId } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORY_ID);
  const [activeTab, setActiveTab] = useState<"tables" | "menu">("tables");
  const [note, setNote] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [autoOpenMenu, setAutoOpenMenu] = useState(true);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isPaying, setIsPaying] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableArea, setNewTableArea] = useState("");
  const [showAddTable, setShowAddTable] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [isSeedingTables, setIsSeedingTables] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!storeId) return;
      try {
        const [productList, tableList, categoryList] = await Promise.all([
          getAllProducts(storeId),
          getTables(storeId),
          getCategories(storeId),
        ]);
        setProducts(productList);
        setTables(tableList);
        setCategories(categoryList);
        if (!tableNumber && tableList.length > 0) {
          setTableNumber(tableList[0].name);
        }
      } catch (error) {
        console.error("Failed to load POS data", error);
      }
    }
    loadData();
  }, [storeId]);

  const categoryOptions = useMemo(() => {
    if (categories.length > 0) {
      return [
        { id: ALL_CATEGORY_ID, name: ALL_CATEGORY },
        ...categories.map((c) => ({ id: c.id, name: c.name })),
      ];
    }
    const setCat = new Set<string>();
    products.forEach((p) => setCat.add(p.category || "Khác"));
    return [
      { id: ALL_CATEGORY_ID, name: ALL_CATEGORY },
      ...Array.from(setCat).map((name) => ({ id: name, name })),
    ];
  }, [categories, products]);

  const tableOptions = useMemo(
    () => [{ id: TAKEAWAY_ID, name: TAKEAWAY_NAME }, ...tables],
    [tables]
  );

  const filteredTables = useMemo(() => {
    const keyword = tableSearch.toLowerCase();
    return tableOptions.filter((t) => t.name.toLowerCase().includes(keyword));
  }, [tableOptions, tableSearch]);

  const sortedTables = useMemo(() => {
    const sorted = [...filteredTables].sort((a, b) => {
      if (a.id === TAKEAWAY_ID) return -1;
      if (b.id === TAKEAWAY_ID) return 1;
      return a.name.localeCompare(b.name, "vi", {
        sensitivity: "base",
        numeric: true,
      });
    });
    return sorted;
  }, [filteredTables]);

  const totalTablePages = Math.max(
    1,
    Math.ceil(sortedTables.length / TABLES_PER_PAGE)
  );

  useEffect(() => {
    setTablePage(1);
  }, [tableSearch, tableOptions.length]);

  useEffect(() => {
    setTablePage((prev) => Math.min(prev, totalTablePages));
  }, [totalTablePages]);

  const paginatedTables = useMemo(() => {
    const start = (tablePage - 1) * TABLES_PER_PAGE;
    return sortedTables.slice(start, start + TABLES_PER_PAGE);
  }, [sortedTables, tablePage]);

  const getCategoryLabel = (cat?: string) => {
    if (!cat) return "Khác";
    const found = categories.find((c) => c.id === cat || c.name === cat);
    return found?.name || cat;
  };

  const isCategoryMatch = (itemCategory: string, selected: string) => {
    if (selected === ALL_CATEGORY_ID) return true;
    if (itemCategory === selected) return true;
    const itemCat = categories.find(
      (c) => c.id === itemCategory || c.name === itemCategory
    );
    const selectedCat = categories.find(
      (c) => c.id === selected || c.name === selected
    );
    if (
      itemCat &&
      selectedCat &&
      (itemCat.id === selectedCat.id || itemCat.name === selectedCat.name)
    ) {
      return true;
    }
    return false;
  };

  const filteredMenu = useMemo(() => {
    const items: MenuItem[] = products.map((p) => ({
      id: p.product_code,
      name: p.product_name,
      price: p.price ?? 0,
      category: p.category || "Khác",
    }));

    return items.filter((item) => {
      const matchCategory = isCategoryMatch(item.category, category);
      const matchText = item.name
        .toLowerCase()
        .includes(menuSearch.toLowerCase());
      return matchCategory && matchText;
    });
  }, [category, products, menuSearch, categories]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleAddItem = (item: MenuItem) => {
    setCart((prev) => {
      const current = prev[item.id];
      const quantity = current ? current.quantity + 1 : 1;
      return {
        ...prev,
        [item.id]: { ...item, quantity },
      };
    });
  };

  const handleChangeQty = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const quantity = current.quantity + delta;
      if (quantity <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [id]: { ...current, quantity },
      };
    });
  };
  const handlePay = async () => {
    if (!tableNumber) {
      alert("Vui lòng chọn số bàn gọi.");
      return;
    }
    if (cartItems.length === 0) {
      alert("Chưa có món nào trong giỏ.");
      return;
    }

    openReceiptPreview();
  };

  const openReceiptPreview = () => {
    if (!tableNumber) {
      alert("Vui lòng chọn bàn trước khi in.");
      return;
    }
    if (cartItems.length === 0) {
      alert("Chưa có món nào để in.");
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleString("vi-VN");
    setReceiptData({
      table: tableNumber,
      note: note || undefined,
      items: cartItems,
      total: totalPrice,
      time: formattedDate,
    });
    setShowReceipt(true);
  };

  const handlePrintBill = () => {
    openReceiptPreview();
  };

  const handleConfirmPrint = async () => {
    if (!receiptData || isPaying) return;
    setIsPaying(true);
    try {
      const billId = await saveBill({
        tableNumber: receiptData.table,
        note: receiptData.note?.trim() || undefined,
        total: receiptData.total,
        storeId,
        items: receiptData.items.map((item) => ({
          menuId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          lineTotal: item.price * item.quantity,
        })),
      });

      // in bill
      const receiptItems = receiptData.items
        .map(
          (item) => `
          <tr>
            <td style="padding:4px 0;">${item.name} (${item.quantity}x)</td>
            <td style="text-align:right;padding:4px 0;">${formatCurrency(
              item.price * item.quantity
            )} đ</td>
          </tr>
        `
        )
        .join("");

      const receiptHtml = `
      <html>
        <head>
          <title>Bill - ${receiptData.table}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { font-family: Arial, sans-serif; width: 80mm; margin: 0 auto; padding: 0; }
            h2, p { margin: 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .total { font-weight: 700; font-size: 14px; }
            hr { border: 0; border-top: 1px dashed #999; margin: 8px 0; }
          </style>
        </head>
        <body>
          <h2>Hoá đơn</h2>
          <p>Bàn: <strong>${receiptData.table}</strong></p>
          <p>Thời gian: ${receiptData.time}</p>
          ${receiptData.note ? `<p>Ghi chú: ${receiptData.note}</p>` : ""}
          <p>Mã bill: ${billId}</p>
          <hr />
          <table>
            <tbody>
              ${receiptItems}
            </tbody>
          </table>
          <hr />
          <table>
            <tr class="total">
              <td>Tổng cộng</td>
              <td style="text-align:right;">${formatCurrency(
                receiptData.total
              )} đ</td>
            </tr>
          </table>
          <p style="text-align:center; margin-top: 12px;">Cảm ơn Quý khách!</p>
        </body>
      </html>
    `;

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(receiptHtml);
        doc.close();
        iframe.onload = () => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 500);
        };
      } else {
        document.body.removeChild(iframe);
        alert("Không thể in, vui lòng kiểm tra trình duyệt.");
      }

      setCart({});
      setNote("");
      setShowReceipt(false);
    } catch (error) {
      console.error(error);
      alert("Lỗi khi lưu hoặc in bill. Vui lòng thử lại.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleSelectTable = (name: string) => {
    setTableNumber(name);
    if (autoOpenMenu) {
      setActiveTab("menu");
    }
  };

  const handleAddTable = async () => {
    if (!newTableName.trim()) {
      alert("Nhập tên/số bàn trước khi lưu.");
      return;
    }
    try {
      const id = await addTable(newTableName, newTableArea, storeId);
      if (id) {
        const refreshed = await getTables(storeId);
        setTables(refreshed);
        setTableNumber(newTableName.trim());
        setNewTableName("");
        setNewTableArea("");
        setShowAddTable(false);
      }
    } catch (error) {
      console.error(error);
      alert("Không lưu được số bàn, vui lòng thử lại.");
    }
  };

  const handleSeedTables = async () => {
    if (isSeedingTables) return;
    const seedNames = Array.from(
      { length: 99 },
      (_, i) => `T${String(i + 1).padStart(2, "0")}`
    );
    const existingNames = new Set(tables.map((t) => t.name.toLowerCase()));
    const missing = seedNames.filter(
      (name) => !existingNames.has(name.toLowerCase())
    );

    if (missing.length === 0) {
      alert("Đã có đủ 100 bàn trong hệ thống.");
      return;
    }

    const confirmMsg = `Thêm nhanh ${missing.length} bàn mới (T01...T99). Tiếp tục?`;
    if (!window.confirm(confirmMsg)) return;

    setIsSeedingTables(true);
    try {
      await Promise.all(missing.map((name) => addTable(name, "", storeId)));
      const refreshed = await getTables(storeId);
      setTables(refreshed);
      alert(`Đã thêm ${missing.length} bàn.`);
    } catch (error) {
      console.error(error);
      alert("Lỗi khi thêm 100 bàn. Vui lòng thử lại.");
    } finally {
      setIsSeedingTables(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;
      if (isTyping) return;

      if (showReceipt && receiptData) {
        e.preventDefault();
        handleConfirmPrint();
        return;
      }

      if (cartItems.length > 0 && !isPaying) {
        e.preventDefault();
        handlePay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    showReceipt,
    receiptData,
    cartItems.length,
    isPaying,
    handlePay,
    handleConfirmPrint,
  ]);

  return (
    <RoleGuard allowedRoles={["admin", "user"]}>
      <main className="min-h-screen bg-slate-50 p-3 sm:p-6">
        <div className="mx-auto max-w-[1400px] overflow-hidden rounded-2xl border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              {role === "admin" && (
                <Link
                  href="/"
                  className="hidden rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 sm:inline-flex"
                  title="Về trang chủ"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              )}
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700">
                  <Coffee className="h-4 w-4" />
                  Quầy thu ngân
                </p>
                <h1 className="text-xl font-bold leading-tight text-slate-900">
                  Bán hàng tại quán
                </h1>
              </div>
            </div>
            <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex">
              <Button
                variant="ghost"
                onClick={logout}
                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                size="sm"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </Button>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-2" />
              <span>
                {tables.length} bàn · {filteredMenu.length} món
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(380px,1fr)]">
            <section className="border-r bg-white">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("tables")}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeTab === "tables"
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Phòng bàn
                  </button>
                  <button
                    onClick={() => setActiveTab("menu")}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeTab === "menu"
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <NotebookTabs className="h-4 w-4" />
                    Thực đơn
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {activeTab === "tables"
                      ? "Tìm bàn (F3)"
                      : `Tìm món (F4) - ${filteredMenu.length} món`}
                  </span>
                </div>
              </div>

              {activeTab === "tables" && (
                <div className="space-y-4 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-sky-700">
                        <LayoutGrid className="h-4 w-4" />
                        <span className="text-sm font-semibold">
                          {tableOptions.length} bàn
                        </span>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          checked={autoOpenMenu}
                          onChange={(e) => setAutoOpenMenu(e.target.checked)}
                        />
                        Mở thực đơn khi chọn bàn
                      </label>
                    </div>
                    <Input
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Tìm bàn..."
                      className="w-full max-w-xs"
                    />
                  </div>
                  {/* 
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">
                    Tất cả ({tableOptions.length})
                  </span>
                  <span>Đang dùng ({tableNumber ? 1 : 0})</span>
                  <span>
                    Còn trống (
                    {Math.max(tableOptions.length - (tableNumber ? 1 : 0), 0)})
                  </span>
                </div> */}

                  <div className="grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto pb-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                    {paginatedTables.map((table) => {
                      const active = table.name === tableNumber;
                      return (
                        <button
                          key={table.id}
                          onClick={() => handleSelectTable(table.name)}
                          className={`flex h-28 flex-col items-center justify-center rounded-2xl border text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                            active
                              ? "border-sky-600 bg-sky-600 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-200"
                          }`}
                        >
                          <div className="flex h-10 w-14 items-center justify-center rounded-xl border-2 border-dashed border-white/70 opacity-80" />
                          <span className="mt-2 text-base">{table.name}</span>
                          {active && (
                            <span className="mt-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium">
                              Đang chọn (máy này)
                            </span>
                          )}
                          {!active && (
                            <span className="mt-1 text-[11px] font-medium text-slate-500">
                              Chạm để chọn
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {paginatedTables.length === 0 && (
                      <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                        Không tìm thấy bàn phù hợp.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-sm text-slate-600">
                    <span>
                      Trang {tablePage}/{totalTablePages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTablePage((p) => Math.max(p - 1, 1))}
                        disabled={tablePage === 1}
                        className="flex items-center gap-1 rounded-full border px-3 py-1 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Trước
                      </button>
                      <button
                        onClick={() =>
                          setTablePage((p) => Math.min(p + 1, totalTablePages))
                        }
                        disabled={tablePage === totalTablePages}
                        className="flex items-center gap-1 rounded-full border px-3 py-1 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Sau
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* <div className="space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                  <button
                    className="text-sm font-semibold text-sky-700 hover:text-sky-800"
                    onClick={() => setShowAddTable((prev) => !prev)}
                  >
                    {showAddTable ? "Ẩn thêm bàn nhanh" : "+ Thêm bàn nhanh"}
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      className="border-sky-500 text-sky-700 hover:bg-sky-50"
                      onClick={handleSeedTables}
                      disabled={isSeedingTables}
                    >
                      {isSeedingTables
                        ? "Đang thêm 99 bàn..."
                        : "Thêm 99 bàn (T01 - T99)"}
                    </Button>
                    <span className="text-xs text-slate-500">
                      Bỏ qua tên đã tồn tại, chỉ thêm bàn còn thiếu.
                    </span>
                  </div>
                  {showAddTable && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_2fr_auto]">
                      <Input
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        placeholder="Tên/số bàn mới"
                      />
                      <Input
                        value={newTableArea}
                        onChange={(e) => setNewTableArea(e.target.value)}
                        placeholder="Khu vực (tùy chọn)"
                      />
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        variant="outline"
                        onClick={handleAddTable}
                      >
                        Lưu bàn
                      </Button>
                    </div>
                  )}
                </div> */}
                </div>
              )}

              {activeTab === "menu" && (
                <div className="space-y-4 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-sky-700">
                        <Coffee className="h-4 w-4" />
                        <span className="text-sm font-semibold">Thực đơn</span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {filteredMenu.length} món khả dụng
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <Input
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                        placeholder="Tìm món..."
                        className="w-full max-w-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pb-1">
                    {categoryOptions.map((c) => {
                      const active = c.id === category;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setCategory(c.id)}
                          className={`whitespace-nowrap cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            active
                              ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid max-h-110 gap-3 overflow-y-auto pb-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {filteredMenu.map((item) => {
                      const inCart = cart[item.id]?.quantity ?? 0;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleAddItem(item)}
                          className="group cursor-pointer flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-600">
                              {getCategoryLabel(item.category)}
                            </span>
                            {inCart > 0 && (
                              <span className="rounded-full bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700">
                                {inCart}x
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-col gap-3">
                            <div className="flex h-8 items-center justify-center rounded-xl bg-sky-50">
                              <Coffee className="h-8 w-8 opacity-70" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-sky-700">
                                {formatCurrency(item.price)} đ
                              </p>
                              <p className="text-sm font-semibold leading-tight text-slate-900">
                                {item.name}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {filteredMenu.length === 0 && (
                      <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                        Không tìm thấy món phù hợp.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="flex h-full flex-col bg-slate-50">
              <div className="border-b bg-white px-4 py-3 space-y-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Bàn
                    </span>
                    <Input
                      list="table-options"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Chọn hoặc nhập bàn"
                      className="w-[200px]"
                    />
                    <datalist id="table-options">
                      {tables.map((table) => (
                        <option key={table.id} value={table.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShoppingCart className="h-4 w-4" />
                    <span>{totalItems} món trong giỏ</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Đơn hiện tại
                    </h2>
                  </div>
                </div>

                <div className="flex-1 max-h-[50vh] space-y-3 overflow-y-auto px-4 pb-4">
                  {cartItems.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 p-4 text-sm text-slate-500">
                      Chưa có món nào. Chọn món từ danh sách bên trái.
                    </div>
                  )}

                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatCurrency(item.price)} đ
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleChangeQty(item.id, -1)}
                          className="rounded-full cursor-pointer border-slate-200"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-semibold">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleChangeQty(item.id, 1)}
                          className="rounded-full cursor-pointer border-slate-200"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <div className="w-[90px] text-right text-base font-semibold text-slate-900">
                          {formatCurrency(item.price * item.quantity)} đ
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t bg-white px-4 py-4">
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú cho đơn (tùy chọn)"
                  />
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Số món</span>
                    <span className="font-semibold text-slate-900">
                      {totalItems}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Tổng tiền</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {formatCurrency(totalPrice)} đ
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <Button
                        className="w-full gap-2 bg-sky-600 hover:bg-sky-700 sm:w-auto"
                        onClick={handlePay}
                        disabled={cartItems.length === 0 || isPaying}
                        isLoading={isPaying}
                      >
                        <CreditCard className="h-4 w-4" />
                        Thanh toán
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {showReceipt && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-lg">
            <div className="border-b px-4 py-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Xem trước bill
              </h3>
              <p className="text-xs text-slate-500">
                Bàn: {receiptData.table} · {receiptData.time}
              </p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 py-3 space-y-3">
              <div className="text-sm text-slate-700">
                <p>
                  Tổng:{" "}
                  <strong className="text-slate-900">
                    {formatCurrency(receiptData.total)} đ
                  </strong>
                </p>
                {receiptData.note && (
                  <p className="text-xs text-slate-500">
                    Ghi chú: {receiptData.note}
                  </p>
                )}
              </div>
              <div className="divide-y rounded-lg border bg-slate-50">
                {receiptData.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} x {formatCurrency(item.price)} đ
                      </p>
                    </div>
                    <div className="text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(item.price * item.quantity)} đ
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t bg-slate-50 px-4 py-3">
              <Button variant="outline" onClick={() => setShowReceipt(false)}>
                Đóng
              </Button>
              <Button
                onClick={handleConfirmPrint}
                className="bg-sky-600 hover:bg-sky-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}
