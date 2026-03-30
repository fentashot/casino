import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "./auth-context";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

//Create a new query client instance
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Prevent automatic refetch every time the user switches back to
			// the browser tab — this was the main cause of excessive
			// /api/blackjack/shoe-info (and other) requests.
			refetchOnWindowFocus: false,
			// Default stale time: treat data as fresh for 10 s so that
			// multiple components mounting at the same time share one request.
			staleTime: 10_000,
		},
	},
});

// Create a new router instance
interface InitialContext {
	queryClient: typeof queryClient;
	auth: {
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
	};
}

const router = createRouter({
	routeTree,
	context: {
		queryClient,
		auth: {
			isAuthenticated: false,
			user: null,
			refreshSession: async () => {},
			logout: async () => {},
		},
	} as InitialContext,
});

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}
createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<InnerApp />
			</AuthProvider>
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	</StrictMode>,
);

function InnerApp() {
	const auth = useAuth();

	return <RouterProvider router={router} context={{ auth }} />;
}
