import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export const Route = createFileRoute("/_authenticated/games")({
	component: () => (
		<ErrorBoundary>
			<Outlet />
		</ErrorBoundary>
	),
});
