/* ============================================================================
   BalanceChart
   Area chart showing cumulative profit/loss over sequential rounds.
   One responsibility: render the balance history series. No data fetching.
   ============================================================================ */

import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/format";
import type { BalancePoint } from "@/lib/stats/types";

interface BalanceChartProps {
	series: BalancePoint[];
}

const chartConfig = {
	balance: {
		label: "Profit / Loss",
		color: "hsl(var(--primary))",
	},
} satisfies ChartConfig;

export function BalanceChart({ series }: BalanceChartProps) {
	if (series.length === 0) {
		return <EmptyState />;
	}

	// Determine if overall trend is positive or negative for gradient colour
	const lastValue = series[series.length - 1]?.balance ?? 0;
	const isPositive = lastValue >= 0;

	const gradientId = "balanceGradient";

	return (
		<ChartContainer config={chartConfig} className="h-[260px] w-full">
			<AreaChart
				data={series}
				margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
			>
				<defs>
					<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="5%"
							stopColor={isPositive ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)"}
							stopOpacity={0.25}
						/>
						<stop
							offset="95%"
							stopColor={isPositive ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)"}
							stopOpacity={0.02}
						/>
					</linearGradient>
				</defs>

				<CartesianGrid
					strokeDasharray="3 3"
					stroke="hsl(var(--border))"
					opacity={0.4}
					vertical={false}
				/>

				{/* Zero reference line */}
				<ReferenceLine
					y={0}
					stroke="hsl(var(--border))"
					strokeWidth={1}
					strokeDasharray="4 2"
				/>

				<XAxis
					dataKey="round"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					minTickGap={40}
					tick={{ fontSize: 11 }}
					tickFormatter={(v: number) => `#${v}`}
				/>

				<YAxis
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					width={72}
					tick={{ fontSize: 11 }}
					tickFormatter={(v: number) => (v === 0 ? "0" : formatCurrency(v))}
				/>

				<ChartTooltip
					cursor={{
						stroke: "hsl(var(--border))",
						strokeWidth: 1,
						strokeDasharray: "3 3",
					}}
					content={
						<ChartTooltipContent
							labelFormatter={(
								_: unknown,
								payload: Array<{ payload?: BalancePoint }>,
							) => {
								const point = payload?.[0]?.payload as BalancePoint | undefined;
								if (!point) return "";
								const date = new Date(point.date);
								return `Runda #${point.round} · ${date.toLocaleDateString(
									"pl-PL",
									{
										day: "2-digit",
										month: "short",
										hour: "2-digit",
										minute: "2-digit",
									},
								)}`;
							}}
							formatter={(value: number) => {
								const v = Number(value);
								return [
									<span
										key="val"
										className={
											v >= 0
												? "text-emerald-400 font-mono"
												: "text-red-400 font-mono"
										}
									>
										{v >= 0 ? "+" : ""}
										{formatCurrency(v)}
									</span>,
									"Profit/Loss",
								];
							}}
						/>
					}
				/>

				<Area
					type="monotone"
					dataKey="balance"
					stroke={isPositive ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)"}
					strokeWidth={2}
					fill={`url(#${gradientId})`}
					dot={false}
					activeDot={{
						r: 4,
						fill: isPositive ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)",
						stroke: "hsl(var(--background))",
						strokeWidth: 2,
					}}
				/>
			</AreaChart>
		</ChartContainer>
	);
}

function EmptyState() {
	return (
		<div className="flex h-[260px] items-center justify-center">
			<p className="text-sm text-muted-foreground">
				Brak danych — zagraj kilka rund, żeby zobaczyć wykres.
			</p>
		</div>
	);
}
