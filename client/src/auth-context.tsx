import { Sparkles } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@/lib/api";
import { getSession, signOut } from "./lib/auth-client";

type UserRole = "user" | "admin";

type User = {
  id: string;
  name: string;
  email: string;
  balance: number;
  role: UserRole;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const refreshSession = useCallback(async () => {
    const session = await getSession();

    if (!session?.data) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Fetch balance and user role
    const [balanceRes, meRes] = await Promise.all([
      api.casino.balance.$get(),
      fetch("/api/me", { credentials: "include" }),
    ]);

    const balanceData = await balanceRes.json();
    const meData = meRes.ok
      ? ((await meRes.json()) as { role: UserRole })
      : { role: "user" as const };

    setIsAuthenticated(true);
    setUser({
      ...session.data.user,
      balance: "balance" in balanceData ? balanceData.balance : 0,
      role: meData.role,
    });
    setIsLoading(false);
  }, []);

  const logout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("better-auth.session_token");
    localStorage.removeItem("better-auth.state");
    location.reload();
  };

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
        {/* Logo + spinner */}
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          {/* Icon */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>

          {/* Brand */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold tracking-tight text-foreground">
              SWAG
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
              Casino
            </span>
          </div>

          {/* Subtle loading bar */}
          <div className="w-32 h-0.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full w-1/3 rounded-full bg-primary animate-[shimmer_1.5s_ease-in-out_infinite]"
              style={{
                backgroundSize: "200% 100%",
                background:
                  "linear-gradient(90deg, transparent, hsl(160 84% 40%), transparent)",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, refreshSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
