import { Outlet } from "@tanstack/react-router";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";

export function AuthenticatedLayout() {
	return (
		<div className="relative min-h-dvh bg-background">
			{/* Desktop sidebar */}
			<AppSidebar />

			{/* Main content area */}
			<main className="relative min-h-dvh transition-all duration-300 ease-out lg:pl-sidebar pb-bottom-nav lg:pb-0">
				{/* Top border accent */}
				<div className="sticky top-0 z-10 h-px bg-border" />

				{/* Page content */}
				<div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<Outlet />
				</div>
			</main>

			{/* Mobile bottom navigation */}
			<BottomNav />
		</div>
	);
}
