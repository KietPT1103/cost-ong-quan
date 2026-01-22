"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Package,
  Coffee,
  LogOut,
  Wallet,
  FileText,
  BarChart3,
  ReceiptText,
  Menu,
  X,
  Calculator
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

const navItems = [
  { href: "/pos", label: "Bán hàng", icon: Coffee },
  { href: "/", label: "Dashboard", icon: Calculator },
  { href: "/reports", label: "Báo cáo", icon: FileText },
  { href: "/cash-flow", label: "Dòng tiền", icon: BarChart3 },
  { href: "/bills", label: "Hóa đơn", icon: ReceiptText },
  { href: "/product", label: "Sản phẩm", icon: Package },
  { href: "/payroll", label: "Tính lương", icon: Wallet },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-sm border border-slate-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:flex lg:flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
             <div className="p-1.5 bg-primary/10 rounded-lg">
                <Calculator className="w-6 h-6" />
             </div>
             <span>Cost Ông Quan</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-slate-400")} />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100">
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full flex items-center justify-start gap-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </Button>
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
            className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
}
