import { Button } from "@/components/ui/button";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Shield, Zap, Gem } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({
        to: "/games",
      });
    }
  },
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-dvh flex flex-col overflow-hidden bg-background">
      {/* === Ambient background effects === */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Primary gradient orb — top left */}
        <div className="absolute -top-[30%] -left-[15%] h-[70vh] w-[70vh] rounded-full bg-primary/[0.07] blur-[120px] animate-gradient" />
        {/* Gold accent orb — bottom right */}
        <div className="absolute -bottom-[20%] -right-[10%] h-[50vh] w-[50vh] rounded-full bg-accent/[0.05] blur-[100px] animate-gradient" />
        {/* Center subtle radial */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[80vh] w-[80vh] rounded-full bg-primary/[0.03] blur-[150px]" />
        {/* Dot grid overlay */}
        <div className="absolute inset-0 bg-dots opacity-30" />
      </div>

      {/* === Top nav bar === */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 glow-emerald">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">
              NEXUS
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Casino
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-10 pb-20">
        {/* Badge */}
        <div className="mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Zap className="h-3 w-3" />
            <span>Provably Fair Gaming</span>
          </div>
        </div>

        {/* Heading */}
        <div
          className="text-center max-w-3xl space-y-6 animate-slide-up"
          style={{ animationDelay: "80ms" }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]">
            <span className="text-foreground">The future of</span>
            <br />
            <span className="text-gradient-premium">online casino</span>
          </h1>

          <p className="mx-auto max-w-lg text-base sm:text-lg text-muted-foreground leading-relaxed font-light">
            Minimalist design meets transparent gaming. Every spin is
            cryptographically verified. No tricks, no gimmicks — just pure
            premium experience.
          </p>
        </div>

        {/* CTAs */}
        <div
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 animate-slide-up"
          style={{ animationDelay: "160ms" }}
        >
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-semibold gap-2 glow-emerald transition-shadow hover:glow-emerald-strong"
            onClick={() => navigate({ to: "/register" })}
          >
            Create Account
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base font-medium border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
            onClick={() => navigate({ to: "/login" })}
          >
            Sign In
          </Button>
        </div>

        {/* Feature pills */}
        <div
          className="mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-6 animate-slide-up"
          style={{ animationDelay: "240ms" }}
        >
          {[
            {
              icon: Shield,
              label: "Provably Fair",
              sublabel: "SHA-256 verified",
            },
            {
              icon: Zap,
              label: "Instant Payouts",
              sublabel: "No delays",
            },
            {
              icon: Gem,
              label: "Premium UX",
              sublabel: "Built different",
            },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm px-5 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
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

      {/* === Bottom ambient line === */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent z-10" />
    </div>
  );
}
