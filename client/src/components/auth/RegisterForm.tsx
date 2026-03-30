import { Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/auth-context";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export default function RegisterForm() {
	const { refreshSession } = useAuth();
	const navigate = useNavigate();

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirmation, setPasswordConfirmation] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleRegister = async () => {
		setError(null);

		if (password !== passwordConfirmation) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		await signUp.email({
			email,
			password,
			name: `${firstName} ${lastName}`.trim(),
			callbackURL: "/games",
			fetchOptions: {
				onRequest: () => setLoading(true),
				onResponse: () => setLoading(false),
				onError: (ctx) => {
					setError(ctx.error.message);
					toast.error(ctx.error.message);
				},
				onSuccess: async () => {
					await refreshSession();
					navigate({ to: "/games" });
					throw redirect({ to: "/games" });
				},
			},
		});
	};

	return (
		<div className="w-full max-w-md mx-auto">
			{/* Back link */}
			<Link
				to="/"
				className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
			>
				<ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
				Back to home
			</Link>

			<Card className="border-border bg-card shadow-sm">
				<CardHeader className="pb-4 space-y-2">
					<CardTitle className="text-2xl font-bold tracking-tight">
						Create your account
					</CardTitle>
					<CardDescription className="text-sm text-muted-foreground">
						Join the next generation of online gaming
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-6">
					{/* Error message */}
					{error && (
						<div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
							{error}
						</div>
					)}

					<form
						className="space-y-4"
						onSubmit={(e) => {
							e.preventDefault();
							handleRegister();
						}}
					>
						{/* Name fields */}
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label
									htmlFor="first-name"
									className="text-sm font-medium text-foreground/80"
								>
									First name
								</Label>
								<Input
									id="first-name"
									placeholder="John"
									required
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
									className="h-11 bg-muted/30 border-border/50 placeholder:text-muted-foreground/40 focus-visible:ring-primary/30 focus-visible:border-primary/50"
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="last-name"
									className="text-sm font-medium text-foreground/80"
								>
									Last name
								</Label>
								<Input
									id="last-name"
									placeholder="Doe"
									required
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									className="h-11 bg-muted/30 border-border/50 placeholder:text-muted-foreground/40 focus-visible:ring-primary/30 focus-visible:border-primary/50"
								/>
							</div>
						</div>

						{/* Email */}
						<div className="space-y-2">
							<Label
								htmlFor="email"
								className="text-sm font-medium text-foreground/80"
							>
								Email
							</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="h-11 bg-muted/30 border-border/50 placeholder:text-muted-foreground/40 focus-visible:ring-primary/30 focus-visible:border-primary/50"
							/>
						</div>

						{/* Password */}
						<div className="space-y-2">
							<Label
								htmlFor="password"
								className="text-sm font-medium text-foreground/80"
							>
								Password
							</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								autoComplete="new-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="h-11 bg-muted/30 border-border/50 placeholder:text-muted-foreground/40 focus-visible:ring-primary/30 focus-visible:border-primary/50"
							/>
						</div>

						{/* Confirm Password */}
						<div className="space-y-2">
							<Label
								htmlFor="password_confirmation"
								className="text-sm font-medium text-foreground/80"
							>
								Confirm password
							</Label>
							<Input
								id="password_confirmation"
								type="password"
								placeholder="••••••••"
								autoComplete="new-password"
								value={passwordConfirmation}
								onChange={(e) => setPasswordConfirmation(e.target.value)}
								className="h-11 bg-muted/30 border-border/50 placeholder:text-muted-foreground/40 focus-visible:ring-primary/30 focus-visible:border-primary/50"
							/>
						</div>

						{/* Submit */}
						<Button
							type="submit"
							className={cn(
								"w-full h-11 text-sm font-semibold transition-all mt-2",
								"bg-primary hover:bg-primary/90 text-primary-foreground",
								"",
							)}
							disabled={loading}
						>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Create Account"
							)}
						</Button>
					</form>

					{/* Divider */}
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border/50" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-card px-3 text-muted-foreground font-medium tracking-wider">
								or
							</span>
						</div>
					</div>

					{/* Terms note */}
					<p className="text-center text-xs text-muted-foreground leading-relaxed">
						By creating an account, you agree to our terms of service and
						acknowledge that all games use provably fair algorithms.
					</p>

					{/* Footer link */}
					<p className="text-center text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link
							to="/login"
							className="font-medium text-primary hover:text-primary/80 transition-colors"
						>
							Sign in
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
