import { createFileRoute, redirect } from "@tanstack/react-router";
import LoginFrom from "@/components/LoginForm";

export const Route = createFileRoute("/login")({
    beforeLoad: ({ context }) => {
        // Redirect if already authenticated
        if (context.auth.isAuthenticated) {
            throw redirect({
                to: "/games",
            });
        }
    },
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <div className="flex items-center justify-center mt-16 min-w-md">
            <LoginFrom />
        </div>
    );
}
