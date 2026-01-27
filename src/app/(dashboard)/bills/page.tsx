"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bill, deleteBill, getBills, updateBill } from "@/services/billService";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  ArrowLeft,
  CalendarRange,
  Edit3,
  Filter,
  RefreshCcw,
  Search,
  Trash2,
  ReceiptText,
  Clock3,
} from "lucide-react";
import { toDate } from "@/lib/dates";

import RoleGuard from "@/components/RoleGuard";

import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";

type EditFormState = {
  tableNumber: string;
  note: string;
  total: string;
  date: string;
  time: string;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("vi-VN", { minimumFractionDigits: 0 });

const formatDateInput = (date: Date) => {
  const local = new Date(date.getTime());
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().split("T")[0];
};

const getTimestampDate = (bill: Bill) => toDate(bill.createdAt);

export default function BillsPage() {
  const { storeId } = useStore();
  const todayInput = formatDateInput(new Date());

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(todayInput);
  const [endDate, setEndDate] = useState(todayInput);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    tableNumber: "",
    note: "",
    total: "",
    date: todayInput,
    time: "00:00",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadBills = async () => {
    setLoading(true);
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      const data = await getBills({ startDate: start, endDate: end, storeId });
      setBills(data);
    } catch (error) {
      console.error(error);
      alert("Khong the tai danh sach hoa don.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, storeId]);

  const filteredBills = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return bills;
    return bills.filter((bill) => {
      const tableMatch = bill.tableNumber?.toLowerCase().includes(keyword);
      const idMatch = bill.id.toLowerCase().includes(keyword);
      const noteMatch = bill.note?.toLowerCase().includes(keyword);
      return tableMatch || idMatch || noteMatch;
    });
  }, [bills, search]);

  const totalAmount = filteredBills.reduce((sum, bill) => sum + bill.total, 0);

  const openEdit = (bill: Bill) => {
    const created = getTimestampDate(bill) || new Date();
    const hours = String(created.getHours()).padStart(2, "0");
    const minutes = String(created.getMinutes()).padStart(2, "0");

    setEditing(bill);
    setEditForm({
      tableNumber: bill.tableNumber || "",
      note: bill.note || "",
      total: String(bill.total ?? 0),
      date: formatDateInput(created),
      time: `${hours}:${minutes}`,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const parsedTotal = Number(editForm.total);
    if (Number.isNaN(parsedTotal)) {
      alert("Tong tien khong hop le");
      return;
    }

    const payloadDate =
      editForm.date && !Number.isNaN(new Date(editForm.date).getTime())
        ? new Date(editForm.date)
        : undefined;
    if (payloadDate) {
      const [h, m] = editForm.time.split(":").map(Number);
      payloadDate.setHours(h || 0, m || 0, 0, 0);
    }

    const tableNumber = editForm.tableNumber.trim() || editing.tableNumber;

    setSaving(true);
    try {
      await updateBill(editing.id, {
        tableNumber,
        note: editForm.note,
        total: parsedTotal,
        createdAt: payloadDate,
      });
      await loadBills();
      setEditing(null);
    } catch (error) {
      console.error(error);
      alert("Khong the cap nhat hoa don.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bill: Bill) => {
    if (
      !confirm(
        `Ban co chac muon xoa hoa don ${bill.id} cua ban ${bill.tableNumber}?`
      )
    )
      return;
    setDeletingId(bill.id);
    try {
      await deleteBill(bill.id);
      await loadBills();
    } catch (error) {
      console.error(error);
      alert("Khong the xoa hoa don.");
    } finally {
      setDeletingId(null);
    }
  };

  const resetToday = () => {
    const today = formatDateInput(new Date());
    setStartDate(today);
    setEndDate(today);
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <main className="min-h-screen bg-slate-50 p-6 md:p-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-100"
                title="Trang chu"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700">
                  <ReceiptText className="h-4 w-4" />
                  Quan ly hoa don
                </p>
                <h1 className="text-2xl font-bold text-slate-900">
                  Danh sach hoa don
                </h1>
                <p className="text-sm text-slate-500">
                  Mac dinh loc trong ngay de xem tong thu nhanh.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={resetToday}>
                <CalendarRange className="h-4 w-4" />
                Hom nay
              </Button>
              <Button className="gap-2" onClick={loadBills} isLoading={loading}>
                <RefreshCcw className="h-4 w-4" />
                Tai lai
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Filter className="h-5 w-5 text-sky-600" />
                    Loc
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      Tim theo ban / ma
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Nhap ma bill, ban hoac ghi chu"
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <Input
                      type="date"
                      label="Tu ngay"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Input
                      type="date"
                      label="Den ngay"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Tong quan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                    <div>
                      <p className="text-xs uppercase font-semibold text-emerald-700">
                        Tong thu
                      </p>
                      <p className="text-xl font-bold text-emerald-800">
                        {formatCurrency(totalAmount)} VND
                      </p>
                    </div>
                    <ReceiptText className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="rounded-lg bg-white px-3 py-2 border border-slate-100 shadow-sm">
                      <p className="text-xs font-semibold text-slate-500">
                        So bill
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {filteredBills.length}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-2 border border-slate-100 shadow-sm">
                      <p className="text-xs font-semibold text-slate-500">
                        Mon phuc vu
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {filteredBills.reduce(
                          (sum, bill) => sum + (bill.items?.length || 0),
                          0
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ReceiptText className="h-5 w-5 text-sky-700" />
                  Danh sach ({filteredBills.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">
                          Ma
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Thoi gian
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Ban
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Tong tien
                        </th>
                        <th className="px-4 py-3 text-center font-semibold">
                          So mon
                        </th>
                        <th className="px-4 py-3 text-center font-semibold">
                          Hanh dong
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center">
                            Dang tai danh sach...
                          </td>
                        </tr>
                      ) : filteredBills.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            Khong co hoa don nao trong khoang nay.
                          </td>
                        </tr>
                      ) : (
                        filteredBills.map((bill) => {
                          const created = getTimestampDate(bill);
                          return (
                            <tr key={bill.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-mono text-xs">
                                {bill.id}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {created
                                  ? created.toLocaleString("vi-VN")
                                  : "Chua co"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {bill.tableNumber || "Khong ro"}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                {formatCurrency(bill.total)} VND
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600">
                                {bill.items?.length || 0}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => openEdit(bill)}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                    Sua
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => handleDelete(bill)}
                                    isLoading={deletingId === bill.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Xoa
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <p className="text-sm text-slate-500">Cap nhat hoa don</p>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {editing.id}
                  </h3>
                </div>
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  Dong
                </Button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <Input
                    label="Ban"
                    value={editForm.tableNumber}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        tableNumber: e.target.value,
                      }))
                    }
                    placeholder="So ban hoac takeaway"
                  />
                  <Input
                    label="Tong tien (VND)"
                    type="number"
                    value={editForm.total}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        total: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Ghi chu"
                    value={editForm.note}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, note: e.target.value }))
                    }
                    placeholder="Them ghi chu neu can"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Ngay tao"
                    type="date"
                    value={editForm.date}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                  <Input
                    label="Gio"
                    type="time"
                    value={editForm.time}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, time: e.target.value }))
                    }
                  />
                </div>

                {editing.items?.length ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-600 mb-2">
                      <Clock3 className="h-4 w-4" />
                      Mon trong bill ({editing.items.length})
                    </div>
                    <div className="max-h-40 overflow-auto space-y-2 text-sm text-slate-700">
                      {editing.items.map((item, idx) => (
                        <div
                          key={`${item.menuId}-${idx}`}
                          className="flex justify-between gap-2 rounded-md bg-white px-3 py-2 shadow-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">
                              {item.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.quantity} x {formatCurrency(item.price)} VND
                            </p>
                          </div>
                          <div className="text-right font-semibold text-slate-900">
                            {formatCurrency(
                              item.lineTotal || item.price * item.quantity
                            )}{" "}
                            VND
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Huy
                </Button>
                <Button
                  className="bg-sky-600 hover:bg-sky-700 gap-2"
                  onClick={handleSaveEdit}
                  isLoading={saving}
                >
                  <Edit3 className="h-4 w-4" />
                  Luu thay doi
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </RoleGuard>
  );
}
