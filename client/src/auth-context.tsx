import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { getSession, signOut } from "./lib/auth-client";
import { api } from "@/lib/api";

type User = {
    id: string;
    name: string;
    email: string;
    balance: number;
}

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

    const refreshSession = async () => {
        const session = await getSession();

        const res = await api.casino.balance.$get();
        const balanceData = await res.json();

        if (session?.data) {
            setIsAuthenticated(true);
            setUser({ ...session.data.user, balance: balanceData.balance });
            setIsLoading(false);
        } else {
            console.log("Setting authenticated to FALSE - no session data");
            setIsAuthenticated(false);
            setUser(null);
            setIsLoading(false);
        }
    };

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
    }, [isLoading]);

    if (isLoading) {
        return <div>Loading...</div>;
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
