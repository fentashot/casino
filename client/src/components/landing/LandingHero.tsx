import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Gem, Gamepad, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreePatternBackground } from "./ThreePatternBackground";

export function LandingHero() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-75"></div>

        <motion.div
          className="absolute -left-32 top-[-14rem] h-[32rem] w-[32rem] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 38% 40%, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.12) 24%, hsl(var(--primary) / 0.03) 52%, hsl(var(--primary) / 0) 78%)",
          }}
          animate={{
            x: [0, 30, -18, 0],
            y: [0, 24, 10, 0],
            scale: [1, 1.08, 0.94, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute -right-32 bottom-[-16rem] h-[34rem] w-[34rem] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 62% 58%, hsl(var(--accent) / 0.17) 0%, hsl(var(--accent) / 0.08) 26%, hsl(var(--accent) / 0.03) 50%, hsl(var(--accent) / 0) 76%)",
          }}
          animate={{
            x: [0, -26, 12, 0],
            y: [0, -22, -8, 0],
            scale: [1, 0.92, 1.06, 1],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border) / 0.13) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.13) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          animate={{ backgroundPosition: ["0px 0px", "48px 48px"] }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        />

        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--background) / 0.74) 8%, hsl(var(--background) / 0.5) 38%, hsl(var(--background) / 0.42) 62%, hsl(var(--background) / 0.78) 92%)",
            backdropFilter: "blur(0.2px)",
          }}
          animate={{ opacity: [0.84, 0.76, 0.84] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-12 sm:px-10">
        <div className="mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <Zap className="h-3 w-3 text-primary" />
            <span>Get Rich Fast Gaming</span>
          </div>
        </div>

        <div
          className="max-w-2xl space-y-5 text-center animate-slide-up"
          style={{ animationDelay: "80ms" }}
        >
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[4.25rem]">
            Swag
            <span
              className="ml-1 bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(130deg, hsl(var(--primary)) 20%, hsl(var(--accent)) 80%)",
              }}
            >
              casino
            </span>
          </h1>
        </div>

        <div
          className="mt-10 flex flex-col items-center gap-3 animate-slide-up sm:flex-row"
          style={{ animationDelay: "160ms" }}
        >
          <Button
            size="lg"
            className="h-11 gap-2 bg-primary px-8 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
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

        <div
          className="mt-16 flex flex-wrap items-center justify-center gap-3 animate-slide-up"
          style={{ animationDelay: "240ms" }}
        >
          {[
            {
              icon: Gamepad,
              label: "Many Games",
              sublabel: "So many really...",
            },
            { icon: Zap, label: "Big Wins", sublabel: "Biggest wins!!!" },
            { icon: Gem, label: "Premium UX", sublabel: "Very premium indeed" },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card/90 px-5 py-3 backdrop-blur-sm"
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

      <div className="relative z-10 flex items-center justify-center border-t border-border px-10 py-4">
        <span className="text-[11px] text-muted-foreground">
          © 2026 Swag Casino · All outcomes cryptographically verified
        </span>
      </div>
    </div>
  );
}
