/**
 * RouletteResult — Compact result badge showing the last spin number & color.
 * Appears with a smooth slide-up + fade animation when a result lands.
 */

import { cn } from "@/lib/utils";

type Result = {
	number: number;
	color: "red" | "black" | "green";
};

type Props = {
	result: Result | null;
	showResult: boolean;
};

const COLOR_STYLES: Record<
	Result["color"],
	{ bg: string; ring: string; text: string }
> = {
	red: {
		bg: "bg-red-600",
		ring: "ring-red-500/30",
		text: "text-red-400",
	},
	black: {
		bg: "bg-zinc-900 border border-zinc-700",
		ring: "ring-zinc-500/20",
		text: "text-zinc-400",
	},
	green: {
		bg: "bg-emerald-600",
		ring: "ring-emerald-500/30",
		text: "text-emerald-400",
	},
};

export function RouletteResult({ result, showResult }: Props) {
	const style = result ? COLOR_STYLES[result.color] : null;

	return (
		<div className="relative h-12 w-12 overflow-hidden rounded-xl">
			{/* Backdrop */}
			<div className="absolute inset-0 rounded-xl bg-muted/30 border border-border/30" />

			{/* Animated result */}
			<div
				className={cn(
					"absolute inset-0 flex items-center justify-center rounded-xl transition-all duration-500 ease-out",
					showResult && result
						? "translate-y-0 opacity-100 scale-100"
						: "translate-y-4 opacity-0 scale-90",
				)}
			>
				{result && style && (
					<div
						className={cn(
							"flex h-full w-full items-center justify-center rounded-xl ring-2",
							style.bg,
							style.ring,
						)}
					>
						<span className="text-sm font-extrabold text-white font-mono tabular-nums drop-shadow-sm">
							{result.number}
						</span>
					</div>
				)}
			</div>

			{/* Placeholder when no result */}
			{!showResult && (
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="text-xs font-medium text-muted-foreground/40">
						—
					</span>
				</div>
			)}
		</div>
	);
}
