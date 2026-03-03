/* ============================================================================
   DailyBarChart
   Grouped bar chart showing daily wagered vs won amounts.
   One responsibility: render the daily series. No data fetching.
   ============================================================================ */

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DailyPoint } from "@/lib/stats";
import { formatCurrency } from "@/lib/format";

interface DailyBarChartProps {
  series: DailyPoint[];
}

const chartConfig = {
  wagered: {
    label: "Obstawione",
    color: "hsl(217 91% 60%)",
  },
  won: {
    label: "Wygrane",
    color: "hsl(142 71% 45%)",
  },
} satisfies ChartConfig;

export function DailyBarChart({ series }: DailyBarChartProps) {
  // Only show days that had any activity to keep the chart readable
  const active = series.filter((d) => d.rounds > 0);

  if (active.length === 0) {
    return <EmptyState />;
  }

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart
        data={active}
        margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
        barCategoryGap="30%"
        barGap={3}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.4}
          vertical={false}
        />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return d.toLocaleDateString("pl-PL", {
              day: "2-digit",
              month: "short",
            });
          }}
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
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
          content={
            <ChartTooltipContent
              labelFormatter={(v: string) => {
                const d = new Date(v);
                return d.toLocaleDateString("pl-PL", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                });
              }}
              formatter={(value, name) => {
                const label =
                  name === "wagered" ? "Obstawione" : "Wygrane";
                return [
                  <span key={name} className="font-mono">
                    {formatCurrency(Number(value))}
                  </span>,
                  label,
                ];
              }}
            />
          }
        />

        <ChartLegend content={<ChartLegendContent />} />

        <Bar
          dataKey="wagered"
          fill="var(--color-wagered)"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="won"
          fill="var(--color-won)"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ChartContainer>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[260px] items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Brak aktywności w wybranym okresie.
      </p>
    </div>
  );
}
