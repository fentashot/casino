import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Gamepad, Gem, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingThreeBackground } from "./LandingThreeBackground";

export function LandingHero() {
	const navigate = useNavigate();

	return (
		<div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
			<LandingThreeBackground />
			<main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20 sm:px-10">
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
					<h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight text-foreground md:text-7xl lg:text-[5.5rem]">
						Swag
						<span
							className="ml-1 bg-clip-text text-transparent"
							style={{
								backgroundImage:
									"linear-gradient(130deg, hsl(160 84% 39%) 20%, hsl(185 94% 50%) 80%)",
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
							className="flex items-center gap-3 rounded-xl border border-border bg-card/90 px-5 py-3 backdrop-blur-sm shadow-sm"
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
		</div>
	);
}
