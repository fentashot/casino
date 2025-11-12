import RegisterForm from "@/components/RegisterForm";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
    beforeLoad: ({ context }) => {
        // Redirect if already authenticated
        if (context.auth.isAuthenticated) {
            throw redirect({
                to: "/casino",
            });
        }
    },
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <div className="flex items-center justify-center mt-16 min-w-md">
            <RegisterForm />
        </div>
    );
}
