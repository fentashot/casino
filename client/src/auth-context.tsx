import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { getSession, signOut } from "./lib/auth-client";

interface AuthContextType {
    isAuthenticated: boolean;
    user: { id: string; name: string; email: string } | null;
    refreshSession: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<any | null>(null);

    const refreshSession = async () => {
        const session = await getSession();

        console.log("Session data:", session);

        if (session?.data) {
            setIsAuthenticated(true);
            setUser(session.data.user);
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
        location.reload();
    };

    useEffect(() => {
        refreshSession();
    }, []);

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
