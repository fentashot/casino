import { cn } from "@/lib/utils";

interface BlackjackActionsProps {
	canHit: boolean;
	canStand: boolean;
	canDouble: boolean;
	canSplit: boolean;
	isLoading: boolean;
	onHit: () => void;
	onStand: () => void;
	onDouble: () => void;
	onSplit: () => void;
}

interface ActionButtonProps {
	label: string;
	sublabel?: string;
	onClick: () => void;
	disabled: boolean;
	variant: "hit" | "stand" | "double" | "split";
}

const VARIANT_STYLES: Record<ActionButtonProps["variant"], string> = {
	hit: [
		"bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700",
		"border-emerald-500/50 hover:border-emerald-400/70",
		"shadow-emerald-900/30",
		"text-white",
	].join(" "),
	stand: [
		"bg-red-700 hover:bg-red-600 active:bg-red-800",
		"border-red-600/50 hover:border-red-500/70",
		"shadow-red-900/30",
		"text-white",
	].join(" "),
	double: [
		"bg-amber-600 hover:bg-amber-500 active:bg-amber-700",
		"border-amber-500/50 hover:border-amber-400/70",
		"shadow-amber-900/30",
		"text-white",
	].join(" "),
	split: [
		"bg-blue-700 hover:bg-blue-600 active:bg-blue-800",
		"border-blue-600/50 hover:border-blue-500/70",
		"shadow-blue-900/30",
		"text-white",
	].join(" "),
};

function ActionButton({
	label,
	sublabel,
	onClick,
	disabled,
	variant,
}: ActionButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				// Base layout
				"relative flex flex-col items-center justify-center gap-0.5",
				"rounded-xl border px-4 py-3 sm:px-6 sm:py-4",
				"min-w-[72px] sm:min-w-[88px]",
				// Typography
				"font-semibold text-sm sm:text-base tracking-wide",
				// Transition
				"transition-all duration-150 ease-out",
				"shadow-lg",
				// Active state visual
				"active:scale-95 active:shadow-sm",
				// Focus ring
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				// Variant colors
				VARIANT_STYLES[variant],
				// Disabled
				disabled && [
					"opacity-30 cursor-not-allowed pointer-events-none",
					"shadow-none",
				],
			)}
		>
			<span>{label}</span>
			{sublabel && (
				<span className="text-[10px] font-normal opacity-70 tracking-wider uppercase">
					{sublabel}
				</span>
			)}
		</button>
	);
}

export function BlackjackActions({
	canHit,
	canStand,
	canDouble,
	canSplit,
	isLoading,
	onHit,
	onStand,
	onDouble,
	onSplit,
}: BlackjackActionsProps) {
	const allDisabled = isLoading;

	return (
		<div className="flex flex-col items-center gap-3">
			{/* Loading indicator */}
			{isLoading && (
				<div className="flex items-center gap-2 text-xs text-muted-foreground animate-fade-in">
					<span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
					<span>Processing...</span>
				</div>
			)}

			{/* Action buttons row */}
			<div className="flex flex-row items-center gap-2 sm:gap-3">
				<ActionButton
					label="Hit"
					sublabel="+1 card"
					onClick={onHit}
					disabled={allDisabled || !canHit}
					variant="hit"
				/>

				<ActionButton
					label="Stand"
					sublabel="end turn"
					onClick={onStand}
					disabled={allDisabled || !canStand}
					variant="stand"
				/>

				<ActionButton
					label="Double"
					sublabel="×2 bet"
					onClick={onDouble}
					disabled={allDisabled || !canDouble}
					variant="double"
				/>

				<ActionButton
					label="Split"
					sublabel="2 hands"
					onClick={onSplit}
					disabled={allDisabled || !canSplit}
					variant="split"
				/>
			</div>
		</div>
	);
}
