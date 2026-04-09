import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatCardVariant = "default" | "primary" | "win" | "loss" | "warn";

interface StatCardProps {
	label: string;
	value: string;
	icon: ReactNode;
	variant?: StatCardVariant;
	delta?: string;
	deltaPositive?: boolean;
	className?: string;
}

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
		<div className={cn("flex flex-col gap-1.5 p-4", className)}>
			<div className="flex items-center gap-1.5 text-muted-foreground">
				{icon}
				<span className="text-xs font-medium">{label}</span>
			</div>
			<p
				className={cn(
					"text-xl font-bold font-mono tracking-tight",
					VALUE_CLASSES[variant],
				)}
			>
				{value}
			</p>
			{delta && (
				<span
					className={cn(
						"text-[11px] font-medium",
						deltaPositive ? "text-emerald-400" : "text-red-400",
					)}
				>
					{delta}
				</span>
			)}
		</div>
	);
}
