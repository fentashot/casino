import { createFileRoute, redirect } from "@tanstack/react-router";
import { LandingHero } from "@/components/landing/LandingHero";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/games" });
    }
  },
  component: LandingHero,
});
