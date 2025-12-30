"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Coffee, UtensilsCrossed, Tractor } from "lucide-react";
import { useStore, StoreType } from "@/context/StoreContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setStoreId } = useStore();
  const [selectedStore, setSelectedStore] = useState<StoreType>("cafe");

  const stores: { id: StoreType; label: string; icon: React.ReactNode }[] = [
    {
      id: "cafe",
      label: "Cafe",
      icon: <Coffee className="h-6 w-6 text-amber-700" />,
    },
    {
      id: "restaurant",
      label: "Lẩu",
      icon: <UtensilsCrossed className="h-6 w-6 text-red-600" />,
    },
    {
      id: "farm",
      label: "Farm",
      icon: <Tractor className="h-6 w-6 text-green-700" />,
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Set store context immediately after login success
      setStoreId(selectedStore);
      router.push("/");
    } catch (err: any) {
      console.error(err);
      setError("Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md bg-white shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Đăng nhập hệ thống
          </CardTitle>
          <p className="text-center text-sm text-gray-500">
            Chọn mô hình làm việc và đăng nhập
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Store Selection */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {stores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => setSelectedStore(store.id)}
                  className={`cursor-pointer rounded-lg border p-3 text-center transition-all hover:bg-gray-50 ${
                    selectedStore === store.id
                      ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                      : "border-gray-200"
                  }`}
                >
                  <div className="mb-2 flex justify-center">{store.icon}</div>
                  <div className="text-xs font-medium text-gray-900">
                    {store.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={loading}>
              Đăng nhập vào {stores.find((s) => s.id === selectedStore)?.label}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
