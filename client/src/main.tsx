import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import { AuthProvider, useAuth } from "./auth-context";

// Register the router instance for type safety
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

//Create a new query client instance
const queryClient = new QueryClient();

// Create a new router instance
const router = createRouter({
    routeTree,
    context: { queryClient, auth: undefined! },
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <InnerApp />
            </AuthProvider>
            <ReactQueryDevtools initialIsOpen={false} />

        </QueryClientProvider>
    </StrictMode>
);

function InnerApp() {
    const auth = useAuth();

    return <RouterProvider router={router} context={{ auth }} />;
}
