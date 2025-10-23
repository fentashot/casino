import { type QueryClient } from "@tanstack/react-query";
import {
    createRootRouteWithContext,
    Link,
    Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

interface AuthState {
    isAuthenticated: boolean;
    user: { id: string; name: string; email: string } | null;
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
    const { auth: { isAuthenticated } } = Route.useRouteContext();

    return (
        <>
            <div className="p-2 flex gap-2 justify-between">
                {!isAuthenticated && (
                    <nav>
                        <Link to="/" className="[&.active]:font-bold">
                            Home
                        </Link>
                    </nav>
                )}
                {isAuthenticated && (
                    <>
                        <div>
                            <Link
                                to="/apps"
                                className="[&.active]:font-bold"
                            >
                                Dashboard
                            </Link>
                        </div>

                        <Link to="/profile" className="[&.active]:font-bold">
                            Profile
                        </Link>
                    </>
                )}
            </div>
            <hr />
            <Outlet />
            <TanStackRouterDevtools />
        </>
    );
}
