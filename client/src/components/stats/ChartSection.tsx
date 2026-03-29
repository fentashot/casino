/* ============================================================================
   ChartSection
   Reusable section wrapper for chart panels. Renders a heading row with an
   optional period-selector pill group, a description line, a loading skeleton,
   and the chart content as children.

   One responsibility: provide consistent section chrome. No data fetching,
   no chart logic.
   ============================================================================ */

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
		<div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-0.5">
			{options.map((opt) => (
				<button
					key={String(opt.value)}
					type="button"
					onClick={() => onChange(opt.value)}
					className={cn(
						"rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all duration-150",
						value === opt.value
							? "bg-card text-foreground shadow-sm border border-border"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}

/* ── Loading skeleton ────────────────────────────────────────────────────── */

interface SkeletonProps {
	height?: number;
}

function ChartSkeleton({ height = 260 }: SkeletonProps) {
	return (
		<div
			className="w-full rounded-xl bg-muted/30 animate-pulse"
			style={{ height }}
		/>
	);
}

/* ── Section wrapper ─────────────────────────────────────────────────────── */

interface ChartSectionProps {
	title: string;
	description?: string;
	/** Right-side slot — typically a <PeriodSelector> */
	action?: ReactNode;
	isLoading?: boolean;
	/** Skeleton height in px (default 260) */
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
		<section
			className={cn(
				"flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6",
				className,
			)}
		>
			{/* Header row */}
			<div className="flex items-start justify-between gap-3 flex-wrap">
				<div className="flex flex-col gap-0.5 min-w-0">
					<h3 className="text-base font-semibold tracking-tight text-foreground">
						{title}
					</h3>
					{description && (
						<p className="text-xs text-muted-foreground leading-relaxed">
							{description}
						</p>
					)}
				</div>

				{action && <div className="shrink-0">{action}</div>}
			</div>

			{/* Content or skeleton */}
			{isLoading ? <ChartSkeleton height={skeletonHeight} /> : children}
		</section>
	);
}
