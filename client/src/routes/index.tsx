import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
    component: RouteComponent,
});

function RouteComponent() {
    const navigate = useNavigate();

    return (
        <div className="flex justify-center gap-4 mt-16 flex-col max-w-md mx-auto">
            <h1 className="text-3xl text-center">Welcome!</h1>
            <div className="flex flex-col justify-center gap-4 min-w-40 mx-auto">
                <Button onClick={() => navigate({ to: "/login" })}>
                    Log in
                </Button>
                <Button onClick={() => navigate({ to: "/register" })}>
                    Register    
                </Button>
            </div>
        </div>
    );
}
