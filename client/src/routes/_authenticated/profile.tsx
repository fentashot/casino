import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profile")({
    component: Profile,
});

function Profile() {
    const { auth } = Route.useRouteContext();
    return (
        <div>
            <h2>User Profile</h2>
            <p>Username: {auth.user?.name}</p>
            <p>Email: {auth.user?.email}</p>
            <hr />
            <Button variant="outline" onClick={auth.logout}>
                Logout
            </Button>
        </div>
    );
}
