import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error) {
		console.error("[ErrorBoundary]", error);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback ?? (
					<div className="flex flex-col items-center justify-center gap-4 p-8">
						<p className="text-lg text-red-400">Coś poszło nie tak.</p>
						<button
							type="button"
							className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
							onClick={() => this.setState({ hasError: false })}
						>
							Spróbuj ponownie
						</button>
					</div>
				)
			);
		}
		return this.props.children;
	}
}
