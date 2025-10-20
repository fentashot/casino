import MiniNav from "@/components/MiniNav";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/expenses/_expenses")({
    component: () => (
        <div className="space-y-4 mt-10 max-w-lg mx-auto">
            <MiniNav />
            <Outlet />
        </div>
    ),
});
