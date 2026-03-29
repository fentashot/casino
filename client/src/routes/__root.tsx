import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Toaster } from "@/components/ui/toaster";

interface AuthState {
	isAuthenticated: boolean;
	user: {
		id: string;
		name: string;
		email: string;
		balance: number;
		role: "user" | "admin";
	} | null;
	refreshSession: () => Promise<void>;
	logout: () => Promise<void>;
}

interface RouterContext {
	queryClient: QueryClient;
	auth: AuthState;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: Root,
});

function Root() {
	return (
		<>
			<Outlet />
			<Toaster />
			{process.env.NODE_ENV === "development" && <TanStackRouterDevtools />}
		</>
	);
}
