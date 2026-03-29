import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Gem, Shield, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/about")({
	component: About,
});

function About() {
	return (
		<div className="min-h-dvh bg-background">
			<div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
				{/* Back link */}
				<Link
					to="/"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12 group"
				>
					<ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
					Back to home
				</Link>

				{/* Header */}
				<div className="space-y-6 mb-16 animate-fade-in">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 glow-emerald">
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

					<h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
						About <span className="text-primary">NEXUS Casino</span>
					</h1>

					<p className="text-base text-muted-foreground leading-relaxed max-w-lg">
						A next-generation online casino experience built on transparency,
						cryptographic fairness, and premium design. No gimmicks — just pure,
						verifiable gaming.
					</p>
				</div>

				{/* Feature sections */}
				<div
					className="space-y-6 animate-slide-up"
					style={{ animationDelay: "100ms" }}
				>
					<FeatureSection
						icon={<Shield className="h-5 w-5" />}
						title="Provably Fair"
						description="Every game outcome is determined by a SHA-256 HMAC combining a server seed, client seed, and nonce. The server seed hash is published before play begins, and the actual seed is revealed after rotation — allowing anyone to independently verify that results were never manipulated."
					/>

					<FeatureSection
						icon={<Zap className="h-5 w-5" />}
						title="Built for Speed"
						description="Powered by Bun runtime, Hono server framework, and TanStack Router for instant client-side navigation. Every interaction is optimized for sub-100ms responsiveness with real-time balance updates and smooth animations."
					/>

					<FeatureSection
						icon={<Gem className="h-5 w-5" />}
						title="Premium Experience"
						description="Designed with a minimalist philosophy inspired by modern fintech products. Clean typography, generous whitespace, subtle glassmorphism, and thoughtful micro-interactions create an experience that feels premium without being excessive."
					/>
				</div>

				{/* Tech stack */}
				<div
					className="mt-16 animate-slide-up"
					style={{ animationDelay: "200ms" }}
				>
					<h2 className="text-lg font-semibold tracking-tight text-foreground mb-4">
						Tech Stack
					</h2>

					<div className="flex flex-wrap gap-2">
						{[
							"Bun",
							"TypeScript",
							"Hono",
							"React 18",
							"TanStack Router",
							"TanStack Query",
							"Tailwind CSS",
							"shadcn/ui",
							"Framer Motion",
							"Drizzle ORM",
							"better-auth",
						].map((tech) => (
							<span
								key={tech}
								className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
							>
								{tech}
							</span>
						))}
					</div>
				</div>

				{/* Footer note */}
				<div
					className="mt-16 pt-8 border-t border-border/30 animate-slide-up"
					style={{ animationDelay: "300ms" }}
				>
					<p className="text-xs text-muted-foreground/60 leading-relaxed">
						NEXUS Casino is a demonstration project. All balances are virtual.
						This platform is not a licensed gambling operator and does not
						involve real money transactions.
					</p>
				</div>
			</div>
		</div>
	);
}

/* ============================================================================
   SUB-COMPONENTS
   ============================================================================ */

function FeatureSection({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<div className="rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:bg-muted/30">
			<div className="flex gap-4">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/15 text-primary">
					{icon}
				</div>

				<div className="space-y-2 min-w-0">
					<h3 className="text-base font-semibold tracking-tight text-foreground">
						{title}
					</h3>
					<p className="text-sm text-muted-foreground leading-relaxed">
						{description}
					</p>
				</div>
			</div>
		</div>
	);
}
