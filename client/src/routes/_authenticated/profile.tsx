import { AdminSeedPanel } from "@/components/AdminSeedPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";
import { User, Mail, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
    component: Profile,
});

function Profile() {
    const { auth } = Route.useRouteContext();
    const isAdmin = auth.user?.role === "admin";

    return (
        <div className="container mx-auto max-w-4xl p-6 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>

            {/* User Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        User Information
                    </CardTitle>
                    <CardDescription>
                        Your account details
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Name:</span>
                        <span>{auth.user?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Email:</span>
                        <span>{auth.user?.email}</span>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-3">
                            <Shield className="h-4 w-4 text-green-500" />
                            <span className="font-medium">Role:</span>
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
                                Administrator
                            </span>
                        </div>
                    )}
                    <div className="pt-4">
                        <Button variant="outline" onClick={auth.logout}>
                            Logout
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Admin Panel - only visible to admins */}
            {isAdmin && <AdminSeedPanel />}
        </div>
    );
}
