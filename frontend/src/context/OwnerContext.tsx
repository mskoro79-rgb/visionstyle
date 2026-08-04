import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearOwnerToken, getOwnerProfile, getOwnerToken, ownerLogin, setOwnerToken } from "@/services/api";
import type { OwnerProfile } from "@/types";

interface OwnerContextValue {
  owner: OwnerProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const OwnerContext = createContext<OwnerContextValue | undefined>(undefined);

export function OwnerProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!getOwnerToken()) {
        setLoading(false);
        return;
      }
      try {
        const profile = await getOwnerProfile();
        setOwner(profile);
      } catch {
        clearOwnerToken();
        setOwner(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const token = await ownerLogin(email, password);
    setOwnerToken(token.access_token);
    setOwner({ email: token.owner_email, display_name: "Showroom Owner" });
  };

  const logout = () => {
    clearOwnerToken();
    setOwner(null);
  };

  return (
    <OwnerContext.Provider value={{ owner, isAuthenticated: !!owner, loading, login, logout }}>
      {children}
    </OwnerContext.Provider>
  );
}

export function useOwner(): OwnerContextValue {
  const ctx = useContext(OwnerContext);
  if (!ctx) throw new Error("useOwner must be used within OwnerProvider");
  return ctx;
}
