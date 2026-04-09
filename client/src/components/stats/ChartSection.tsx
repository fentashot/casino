import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ── Period selector ─────────────────────────────────────────────────────── */

export interface PeriodOption<T extends string | number = string> {
	label: string;
	value: T;
}

interface PeriodSelectorProps<T extends string | number> {
	options: PeriodOption<T>[];
	value: T;
	onChange: (value: T) => void;
}

export function PeriodSelector<T extends string | number>({
	options,
	value,
	onChange,
}: PeriodSelectorProps<T>) {
	return (
		<div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
			{options.map((opt) => (
				<button
					key={String(opt.value)}
					type="button"
					onClick={() => onChange(opt.value)}
					className={cn(
						"rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150",
						value === opt.value
							? "bg-card text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}

/* ── Section wrapper ─────────────────────────────────────────────────────── */

interface ChartSectionProps {
	title: string;
	description?: string;
	action?: ReactNode;
	isLoading?: boolean;
	skeletonHeight?: number;
	children: ReactNode;
	className?: string;
}

export function ChartSection({
	title,
	description,
	action,
	isLoading = false,
	skeletonHeight = 260,
	children,
	className,
}: ChartSectionProps) {
	return (
		<section className={cn("flex flex-col gap-4", className)}>
			{/* Header */}
			<div className="flex items-center justify-between gap-3">
				<div>
					<h3 className="text-sm font-semibold text-foreground">{title}</h3>
					{description && (
						<p className="text-xs text-muted-foreground mt-0.5">
							{description}
						</p>
					)}
				</div>
				{action && <div className="shrink-0">{action}</div>}
			</div>

			{/* Content */}
			{isLoading ? (
				<div
					className="w-full rounded-lg bg-muted/30 animate-pulse"
					style={{ height: skeletonHeight }}
				/>
			) : (
				children
			)}
		</section>
	);
}
