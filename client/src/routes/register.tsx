import { createFileRoute, redirect } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import RegisterForm from "@/components/auth/RegisterForm";

export const Route = createFileRoute("/register")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/games" });
    }
  },
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center px-6 sm:px-10 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">
              SWAG
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Casino
            </span>
          </div>
        </div>
      </header>

      {/* Form area */}
      <div className=				"flex  items-center justify-center px-4 py-[4vh]">
        <div className="w-full max-w-md animate-slide-up">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
