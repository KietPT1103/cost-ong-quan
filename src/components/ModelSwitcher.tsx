"use client";

import { useAuth } from "@/context/AuthContext";
import { STORE_NAMES, useStore } from "@/context/StoreContext";
import { Check, Settings, Store } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/Button";

export default function ModelSwitcher() {
  const { user, role } = useAuth();
  const { storeId, setStoreId } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  // Only show for admins
  if (!user || role !== "admin") return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-end gap-2">
      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-2 mb-2 w-64 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-900 border-b border-slate-100 mb-1">
            <Store className="w-4 h-4 text-emerald-600" />
            Chọn mô hình làm việc
          </div>
          <div className="space-y-1">
            {Object.entries(STORE_NAMES).map(([key, name]) => (
              <button
                key={key}
                onClick={() => {
                  setStoreId(key);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                  storeId === key
                    ? "bg-emerald-50 text-emerald-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {name}
                {storeId === key && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-full w-12 h-12 p-0 shadow-lg transition-all ${
          isOpen ? "bg-slate-800 rotate-90" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
        title="Đổi mô hình nhanh"
      >
        <Settings className="w-6 h-6 text-white" />
      </Button>
    </div>
  );
}
