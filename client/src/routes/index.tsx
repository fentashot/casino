import { Button } from "@/components/ui/button";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Shield, Zap, Gem } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/games" });
    }
  },
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-dvh flex flex-col bg-background">
      {/* === Top nav bar === */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">
              NEXUS
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Casino
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate({ to: "/login" })}
          >
            Sign in
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            onClick={() => navigate({ to: "/register" })}
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* === Hero section === */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 pb-20 pt-12">
        {/* Badge */}
        <div className="mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" />
            <span>Provably Fair Gaming</span>
          </div>
        </div>

        {/* Heading */}
        <div
          className="text-center max-w-2xl space-y-5 animate-slide-up"
          style={{ animationDelay: "80ms" }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight leading-[1.08] text-foreground">
            The future of
            <br />
            <span className="text-primary">online casino</span>
          </h1>

          <p className="mx-auto max-w-md text-base sm:text-lg text-muted-foreground leading-relaxed">
            Minimalist design meets transparent gaming. Every outcome is
            cryptographically verified — no tricks, no gimmicks.
          </p>
        </div>

        {/* CTAs */}
        <div
          className="mt-10 flex flex-col sm:flex-row items-center gap-3 animate-slide-up"
          style={{ animationDelay: "160ms" }}
        >
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-11 text-sm font-semibold gap-2"
            onClick={() => navigate({ to: "/register" })}
          >
            Create Account
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 px-8 text-sm font-medium"
            onClick={() => navigate({ to: "/login" })}
          >
            Sign In
          </Button>
        </div>

        {/* Feature pills */}
        <div
          className="mt-16 flex flex-wrap items-center justify-center gap-3 animate-slide-up"
          style={{ animationDelay: "240ms" }}
        >
          {[
            { icon: Shield, label: "Provably Fair", sublabel: "SHA-256 verified" },
            { icon: Zap, label: "Instant Payouts", sublabel: "No delays" },
            { icon: Gem, label: "Premium UX", sublabel: "Built different" },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <feature.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {feature.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {feature.sublabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* === Footer divider === */}
      <div className="border-t border-border px-10 py-4 flex items-center justify-center">
        <span className="text-[11px] text-muted-foreground">
          © 2026 Nexus Casino · All outcomes cryptographically verified
        </span>
      </div>
    </div>
  );
}
