import { createFileRoute, redirect } from "@tanstack/react-router";
import LoginForm from "@/components/auth/LoginForm";

export const Route = createFileRoute("/login")({
	beforeLoad: ({ context }) => {
		if (context.auth.isAuthenticated) {
			throw redirect({ to: "/games" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	return (
		<div className="min-h-dvh flex flex-col  bg-background">
			{/* Form area */}
			<div className="flex items-center justify-center px-4 py-[15vh]">
				<div className="w-full max-w-md animate-slide-up">
					<LoginForm />
				</div>
			</div>
		</div>
	);
}
