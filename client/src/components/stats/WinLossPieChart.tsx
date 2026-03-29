/* ============================================================================
   WinLossPieChart
   Donut chart showing win vs loss ratio from overview stats.
   One responsibility: render the win/loss proportion. No data fetching.
   ============================================================================ */

import { Cell, Pie, PieChart } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

interface WinLossPieChartProps {
	winRate: number;
	totalRounds: number;
}

const chartConfig = {
	wins: {
		label: "Wygrane",
		color: "hsl(142 71% 45%)",
	},
	losses: {
		label: "Przegrane",
		color: "hsl(0 72% 51%)",
	},
} satisfies ChartConfig;

export function WinLossPieChart({
	winRate,
	totalRounds,
}: WinLossPieChartProps) {
	if (totalRounds === 0) {
		return <EmptyState />;
	}

	const wins = Math.round((winRate / 100) * totalRounds);
	const losses = totalRounds - wins;

	const data = [
		{ name: "wins", value: wins, label: "Wygrane" },
		{ name: "losses", value: losses, label: "Przegrane" },
	];

	const COLORS = ["hsl(142 71% 45%)", "hsl(0 72% 51%)"];

	return (
		<div className="flex flex-col items-center gap-4">
			<ChartContainer
				config={chartConfig}
				className="h-[200px] w-full max-w-[220px]"
			>
				<PieChart>
					<ChartTooltip
						content={
							<ChartTooltipContent
								formatter={(value, name) => {
									const label = name === "wins" ? "Wygrane" : "Przegrane";
									const pct =
										totalRounds > 0
											? Math.round((Number(value) / totalRounds) * 100)
											: 0;
									return [
										<span key={name} className="font-mono">
											{String(value)} rund ({pct}%)
										</span>,
										label,
									];
								}}
							/>
						}
					/>
					<Pie
						data={data}
						dataKey="value"
						nameKey="name"
						cx="50%"
						cy="50%"
						innerRadius="58%"
						outerRadius="80%"
						paddingAngle={3}
						strokeWidth={0}
					>
						{data.map((entry, index) => (
							<Cell
								key={entry.name}
								fill={COLORS[index]}
								opacity={entry.value === 0 ? 0.15 : 1}
							/>
						))}
					</Pie>

					{/* Centre label rendered via foreignObject for precise positioning */}
					<text
						x="50%"
						y="47%"
						textAnchor="middle"
						dominantBaseline="middle"
						className="fill-foreground"
						style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace" }}
					>
						{winRate}%
					</text>
					<text
						x="50%"
						y="62%"
						textAnchor="middle"
						dominantBaseline="middle"
						style={{
							fontSize: 10,
							fill: "hsl(var(--muted-foreground))",
							fontWeight: 600,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
						}}
					>
						Win rate
					</text>
				</PieChart>
			</ChartContainer>

			{/* Legend */}
			<div className="flex items-center gap-5">
				<LegendItem color={COLORS[0]} label="Wygrane" count={wins} />
				<LegendItem color={COLORS[1]} label="Przegrane" count={losses} />
			</div>
		</div>
	);
}

function LegendItem({
	color,
	label,
	count,
}: {
	color: string;
	label: string;
	count: number;
}) {
	return (
		<div className="flex items-center gap-2">
			<div
				className="h-2.5 w-2.5 rounded-sm shrink-0"
				style={{ backgroundColor: color }}
			/>
			<span className="text-xs text-muted-foreground">
				{label}{" "}
				<span className="font-mono font-semibold text-foreground">{count}</span>
			</span>
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex h-[200px] items-center justify-center">
			<p className="text-sm text-muted-foreground">Brak rozegranych rund.</p>
		</div>
	);
}
