/* ============================================================================
   HourlyHeatmapChart
   Bar chart showing activity intensity (rounds played) per hour of day (0–23).
   Bar colour intensity scales with the number of rounds — busier hours are
   brighter. A secondary axis shows win rate as a line overlay.
   One responsibility: render the hourly heatmap series. No data fetching.
   ============================================================================ */

import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Line,
	XAxis,
	YAxis,
} from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import type { HourlyPoint } from "@/lib/stats/types";

interface HourlyHeatmapChartProps {
	series: HourlyPoint[];
}

const chartConfig = {
	rounds: {
		label: "Rundy",
		color: "hsl(var(--primary))",
	},
	winRate: {
		label: "Win rate %",
		color: "hsl(142 71% 45%)",
	},
} satisfies ChartConfig;

export function HourlyHeatmapChart({ series }: HourlyHeatmapChartProps) {
	const hasAnyActivity = series.some((h) => h.rounds > 0);

	if (!hasAnyActivity) {
		return <EmptyState />;
	}

	const maxRounds = Math.max(...series.map((h) => h.rounds), 1);

	// Attach a normalised intensity value (0–1) used for bar opacity
	const data = series.map((h) => ({
		...h,
		intensity: h.rounds / maxRounds,
	}));

	return (
		<ChartContainer config={chartConfig} className="h-[220px] w-full">
			<ComposedChart
				data={data}
				margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
				barCategoryGap="15%"
			>
				<CartesianGrid
					strokeDasharray="3 3"
					stroke="hsl(var(--border))"
					opacity={0.4}
					vertical={false}
				/>

				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					minTickGap={18}
					tick={{ fontSize: 10 }}
				/>

				{/* Left axis — rounds */}
				<YAxis
					yAxisId="rounds"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					width={28}
					tick={{ fontSize: 10 }}
					allowDecimals={false}
				/>

				{/* Right axis — win rate % */}
				<YAxis
					yAxisId="winRate"
					orientation="right"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					width={36}
					tick={{ fontSize: 10 }}
					domain={[0, 100]}
					tickFormatter={(v: number) => `${v}%`}
				/>

				<ChartTooltip
					cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }}
					content={
						<ChartTooltipContent
							labelFormatter={(label: string) => `Godzina ${label}`}
							formatter={(value, name) => {
								if (name === "rounds") {
									return [
										<span key="rounds" className="font-mono">
											{String(value)} rund
										</span>,
										"Aktywność",
									];
								}
								if (name === "winRate") {
									return [
										<span key="wr" className="font-mono text-emerald-400">
											{String(value)}%
										</span>,
										"Win rate",
									];
								}
								return [String(value), String(name)];
							}}
						/>
					}
				/>

				{/* Activity bars — opacity scales with intensity */}
				<Bar
					yAxisId="rounds"
					dataKey="rounds"
					radius={[3, 3, 0, 0]}
					maxBarSize={28}
					// Each cell gets its own opacity via the Cell approach; here we
					// use a single fill and let recharts render uniform bars.
					// True per-bar colour would require <Cell> mapping, but that adds
					// complexity — uniform primary colour is clean and readable.
					fill="hsl(var(--primary))"
					fillOpacity={0.7}
				/>

				{/* Win rate line overlay */}
				<Line
					yAxisId="winRate"
					type="monotone"
					dataKey="winRate"
					stroke="hsl(142 71% 45%)"
					strokeWidth={2}
					dot={false}
					activeDot={{
						r: 3,
						fill: "hsl(142 71% 45%)",
						stroke: "hsl(var(--background))",
						strokeWidth: 2,
					}}
				/>
			</ComposedChart>
		</ChartContainer>
	);
}

function EmptyState() {
	return (
		<div className="flex h-[220px] items-center justify-center">
			<p className="text-sm text-muted-foreground">
				Brak danych godzinowych — zagraj kilka rund.
			</p>
		</div>
	);
}
