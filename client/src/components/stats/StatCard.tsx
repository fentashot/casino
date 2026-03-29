/* ============================================================================
   StatCard
   Single metric display tile. Renders an icon, label, value, and an optional
   delta badge (e.g. "+12%" or "−5 rounds").

   One responsibility: display a single KPI. No data fetching, no logic.
   ============================================================================ */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatCardVariant = "default" | "primary" | "win" | "loss" | "warn";

interface StatCardProps {
	label: string;
	value: string;
	icon: ReactNode;
	variant?: StatCardVariant;
	/** Optional small badge shown below the value — e.g. "vs last 30 days" */
	delta?: string;
	deltaPositive?: boolean;
	className?: string;
}

const ICON_CLASSES: Record<StatCardVariant, string> = {
	default: "bg-muted/60 text-muted-foreground",
	primary: "bg-primary/10 text-primary",
	win: "bg-emerald-500/10 text-emerald-400",
	loss: "bg-red-500/10 text-red-400",
	warn: "bg-amber-500/10 text-amber-400",
};

const VALUE_CLASSES: Record<StatCardVariant, string> = {
	default: "text-foreground",
	primary: "text-foreground",
	win: "text-emerald-400",
	loss: "text-red-400",
	warn: "text-amber-400",
};

export function StatCard({
	label,
	value,
	icon,
	variant = "default",
	delta,
	deltaPositive,
	className,
}: StatCardProps) {
	return (
		<div
			className={cn(
				"flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
				"transition-colors duration-200 hover:bg-muted/30",
				className,
			)}
		>
			{/* Icon + label row */}
			<div className="flex items-center gap-2">
				<div
					className={cn(
						"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
						ICON_CLASSES[variant],
					)}
				>
					{icon}
				</div>
				<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
					{label}
				</span>
			</div>

			{/* Value */}
			<p
				className={cn(
					"text-xl font-bold font-mono tracking-tight leading-none",
					VALUE_CLASSES[variant],
				)}
			>
				{value}
			</p>

			{/* Delta badge */}
			{delta && (
				<span
					className={cn(
						"inline-flex items-center gap-1 text-[10px] font-semibold rounded-md px-1.5 py-0.5 w-fit",
						deltaPositive
							? "bg-emerald-500/10 text-emerald-400"
							: "bg-red-500/10 text-red-400",
					)}
				>
					{deltaPositive ? "▲" : "▼"} {delta}
				</span>
			)}
		</div>
	);
}
