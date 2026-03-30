import { createFileRoute, redirect } from "@tanstack/react-router";
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
			{/* Form area */}
			<div className="flex  items-center justify-center px-4 py-[10vh]">
				<div className="w-full max-w-md animate-slide-up">
					<RegisterForm />
				</div>
			</div>
		</div>
	);
}
