"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type StoreType = "cafe" | "restaurant" | "farm";

interface StoreContextType {
  storeId: string;
  setStoreId: (id: string) => void;
  storeName: string;
}

const StoreContext = createContext<StoreContextType>({
  storeId: "cafe",
  setStoreId: () => {},
  storeName: "Mô hình Cafe",
});

const STORE_NAMES: Record<string, string> = {
  cafe: "Mô hình Cafe",
  restaurant: "Mô hình Lẩu",
  farm: "Mô hình Farm",
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [storeId, setStoreIdState] = useState<string>("cafe");

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem("selected_store_id");
    if (
      saved &&
      (saved === "cafe" || saved === "restaurant" || saved === "farm")
    ) {
      setStoreIdState(saved);
    }
  }, []);

  const setStoreId = (id: string) => {
    setStoreIdState(id);
    localStorage.setItem("selected_store_id", id);
  };

  const storeName = STORE_NAMES[storeId] || "Cửa hàng";

  return (
    <StoreContext.Provider value={{ storeId, setStoreId, storeName }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
