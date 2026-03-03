import { Outlet } from "@tanstack/react-router";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";

/**
 * AuthenticatedLayout
 *
 * Main shell for authenticated users. Provides:
 * - Desktop: Fixed sidebar on the left, content area offset to the right
 * - Mobile: Full-width content with fixed bottom navigation
 *
 * The layout uses CSS to handle the sidebar width offset rather than JS state,
 * so the sidebar collapse animation is handled purely in CSS via the sidebar component.
 * We use `lg:pl-sidebar` as the default and the sidebar manages its own width.
 */
export function AuthenticatedLayout() {
  return (
    <div className="relative min-h-dvh bg-background">
      {/* Ambient background gradient — subtle depth */}
      <div className="fixed inset-0 z-0 bg-gradient-radial pointer-events-none" />

      {/* Desktop sidebar */}
      <AppSidebar />

      {/* Main content area */}
      <main className="relative z-10 min-h-dvh transition-all duration-300 ease-out lg:pl-sidebar pb-bottom-nav lg:pb-0">
        {/* Top ambient glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

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
