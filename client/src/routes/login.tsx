import { createFileRoute, redirect } from "@tanstack/react-router";
import LoginForm from "@/components/LoginForm";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({
        to: "/games",
      });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-4 py-12 bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[30%] -left-[15%] h-[60vh] w-[60vh] rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[45vh] w-[45vh] rounded-full bg-accent/[0.04] blur-[100px]" />
        <div className="absolute inset-0 bg-dots opacity-20" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3 mb-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 glow-emerald">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-foreground">
            NEXUS
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Casino
          </span>
        </div>
      </div>

      {/* Form */}
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <LoginForm />
      </div>
    </div>
  );
}
