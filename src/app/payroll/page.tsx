"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Users, FileSpreadsheet, ArrowLeft, Wallet } from "lucide-react";
import EmployeeManager from "./_components/EmployeeManager";
import PayrollManager from "./_components/PayrollManager";
import PayrollDetail from "./_components/PayrollDetail";
import Link from "next/link";

export default function PayrollPage() {
  const { user, role, loading } = useAuth();
  const { storeId, storeName } = useStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"employee" | "payroll">("payroll");
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (role === "user") {
        router.push("/pos");
      }
    }
  }, [user, role, loading, router]);

  if (loading || !user || !storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </Button>
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                Quản lý lương
              </h1>
              <span className="text-xs text-slate-500 font-medium ml-7">
                {storeName}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar / Tabs */}
          <aside className="w-full md:w-64 space-y-2">
            <button
              onClick={() => {
                setActiveTab("payroll");
                setSelectedPayrollId(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium transition-colors ${
                activeTab === "payroll"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "hover:bg-white hover:shadow-sm text-slate-600"
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
              Bảng lương
            </button>
            <button
              onClick={() => setActiveTab("employee")}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium transition-colors ${
                activeTab === "employee"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "hover:bg-white hover:shadow-sm text-slate-600"
              }`}
            >
              <Users className="w-5 h-5" />
              Nhân viên
            </button>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === "employee" ? (
              <EmployeeManager storeId={storeId} />
            ) : (
              <>
                {selectedPayrollId ? (
                  <PayrollDetail
                    payrollId={selectedPayrollId}
                    onBack={() => setSelectedPayrollId(null)}
                  />
                ) : (
                  <PayrollManager
                    storeId={storeId}
                    onSelectPayroll={setSelectedPayrollId}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
