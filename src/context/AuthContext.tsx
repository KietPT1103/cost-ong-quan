"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type Role = "admin" | "user";

interface AuthContextType {
  user: User | null;
  role: Role | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        try {
          const email = currentUser.email?.trim();
          if (email) {
            const res = await fetch(
              `/api/users/role?email=${encodeURIComponent(email)}`,
              { cache: "no-store" }
            );
            const json = (await res.json()) as {
              data?: { role?: Role };
              error?: string;
            };
            if (res.ok && json.data?.role) {
              setRole(json.data.role);
            } else {
              setRole("user");
            }
          } else {
            // Fallback to UID lookup if email is not available
            const res = await fetch(`/api/users/${currentUser.uid}`, {
              cache: "no-store",
            });
            const json = (await res.json()) as {
              data?: { role?: Role };
              error?: string;
            };
            if (res.ok && json.data?.role) {
              setRole(json.data.role);
            } else {
              setRole("user");
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole("user");
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
