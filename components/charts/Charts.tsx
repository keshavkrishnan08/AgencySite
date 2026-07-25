"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ink = "#1b2030";
const ink2 = "#585e70";
const grid = "#ece7da";
const primary = "#14808e";
const primaryBright = "#19a9b8";
const sage = "#3e9d6e";
const gold = "#b8893b";

/* Vibrant data-viz palette — chart-only, so the brand teal on buttons and the
   ivory UI stay calm while the graphs pop. Score-based fills map a score to a
   saturated red→amber→cyan→green ramp. */
const VIVID_TEAL = "#06b6d4";   // cyan
const VIVID_TEAL2 = "#0891b2";  // deep cyan
const VIVID_GREEN = "#22c55e";
const VIVID_AMBER = "#f59e0b";
const VIVID_CORAL = "#f43f5e";
/** A rotating set for categorical charts (donuts, category bars). */
export const VIVID_SERIES = ["#06b6d4", "#22c55e", "#f59e0b", "#f43f5e", "#8b5cf6", "#3b82f6", "#ec4899", "#14b8a6"];
/** Saturated colour for a 0–100 score. */
export function vividScore(score: number): string {
  if (score >= 85) return VIVID_GREEN;
  if (score >= 70) return VIVID_TEAL;
  if (score >= 55) return "#0ea5e9";
  if (score >= 40) return VIVID_AMBER;
  return VIVID_CORAL;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur"
      style={{ borderColor: grid }}
    >
      {label && <div className="mb-0.5 text-2xs font-semibold uppercase tracking-wider text-ink-3">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 font-mono text-sm font-semibold" style={{ color: ink }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color || VIVID_TEAL }} />
          {p.name}: <span style={{ color: vividScore(p.value) }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ----------------- Progress over time (area) ----------------- */
export function ProgressLineChart({
  data,
  height = 260,
  showReady = true,
}: {
  data: { label: string; score: number }[];
  height?: number;
  showReady?: boolean;
}) {
  // Re-key on the data so the line visibly redraws (animates) whenever a new
  // score lands or the latest number changes — not just on first mount.
  const animKey = `${data.length}:${data[data.length - 1]?.score ?? 0}`;
  return (
    <ResponsiveContainer key={animKey} width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -4 }}>
        <defs>
          <linearGradient id="progFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VIVID_TEAL} stopOpacity={0.32} />
            <stop offset="100%" stopColor={VIVID_TEAL} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="progStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={VIVID_TEAL2} />
            <stop offset="50%" stopColor={VIVID_TEAL} />
            <stop offset="100%" stopColor={VIVID_GREEN} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} strokeDasharray="4 6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: ink2, fontSize: 12, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
          dy={8}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fill: ink2, fontSize: 11, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        {showReady && (
          <ReferenceLine
            y={80}
            stroke={sage}
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{ value: "Ready", position: "right", fill: sage, fontSize: 11, fontWeight: 600 }}
          />
        )}
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: grid, strokeWidth: 2 }} />
        <Area
          type="monotone"
          dataKey="score"
          name="Score"
          stroke="url(#progStroke)"
          strokeWidth={3}
          fill="url(#progFill)"
          dot={{ fill: "#fff", stroke: VIVID_TEAL, strokeWidth: 2.5, r: 4 }}
          activeDot={{ fill: VIVID_TEAL, stroke: "#fff", strokeWidth: 3, r: 6 }}
          animationDuration={1100}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ----------------- Radar (5 dimensions) ----------------- */
export function RadarScoreChart({
  data,
  height = 300,
}: {
  data: { dimension: string; value: number }[];
  height?: number;
}) {
  const animKey = data.map((d) => Math.round(d.value)).join(",");
  return (
    <ResponsiveContainer key={animKey} width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VIVID_TEAL} stopOpacity={0.42} />
            <stop offset="100%" stopColor={VIVID_GREEN} stopOpacity={0.16} />
          </linearGradient>
        </defs>
        <PolarGrid stroke={grid} />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: ink2, fontSize: 12, fontFamily: "var(--font-sans)", fontWeight: 500 }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Score"
          dataKey="value"
          stroke={VIVID_TEAL}
          strokeWidth={2.5}
          fill="url(#radarFill)"
          dot={{ fill: VIVID_TEAL, stroke: "#fff", strokeWidth: 1.5, r: 3 }}
          animationDuration={900}
        />
        <Tooltip content={<ChartTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/* ----------------- Mini bar chart (colored by value) ----------------- */
export function MiniBars({
  data,
  height = 150,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const animKey = data.map((d) => Math.round(d.value)).join(",");
  return (
    <ResponsiveContainer key={animKey} width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: -22 }}>
        <CartesianGrid stroke={grid} strokeDasharray="4 6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: ink2, fontSize: 11, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis hide domain={[0, "dataMax + 1"]} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(27,32,48,0.04)" }} />
        <Bar dataKey="value" name="Avg" radius={[6, 6, 0, 0]} maxBarSize={30} animationDuration={900}>
          {data.map((d, i) => (
            <Cell key={i} fill={VIVID_SERIES[i % VIVID_SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ----------------- Projection: where you are, where you're headed -----------------
   One chart that carries the whole retention story: the solid line is what you
   actually scored, the dashed line is your own measured pace extended forward,
   and the two reference lines are the bars that matter (Ready at 80, Top 1% at
   94). Seeing the dashed line cross the top line is the reason to come back. */
export function ProjectionChart({
  data,
  readyAt,
  topAt,
  height = 300,
}: {
  data: { label: string; actual?: number | null; projected?: number | null }[];
  readyAt: number;
  topAt: number;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      {/* ComposedChart, not AreaChart: AreaChart drops non-Area children, so the
          dashed projection Line renders as nothing at all. */}
      <ComposedChart data={data} margin={{ top: 14, right: 46, bottom: 0, left: -4 }}>
        <defs>
          <linearGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryBright} stopOpacity={0.24} />
            <stop offset="100%" stopColor={primaryBright} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} strokeDasharray="4 6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: ink2, fontSize: 11, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
          dy={8}
          interval="preserveStartEnd"
          minTickGap={22}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fill: ink2, fontSize: 11, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <ReferenceLine
          y={readyAt}
          stroke={sage}
          strokeDasharray="5 5"
          strokeWidth={1.5}
          label={{ value: "Ready", position: "right", fill: sage, fontSize: 11, fontWeight: 600 }}
        />
        <ReferenceLine
          y={topAt}
          stroke={gold}
          strokeDasharray="5 5"
          strokeWidth={1.5}
          label={{ value: "Top 1%", position: "right", fill: gold, fontSize: 11, fontWeight: 600 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: grid, strokeWidth: 2 }} />
        <Area
          type="monotone"
          dataKey="actual"
          name="You"
          stroke="url(#progStroke)"
          strokeWidth={3}
          fill="url(#projFill)"
          connectNulls
          dot={{ fill: "#fff", stroke: primary, strokeWidth: 2.5, r: 3.5 }}
          activeDot={{ fill: primary, stroke: "#fff", strokeWidth: 3, r: 6 }}
          animationDuration={1100}
        />
        <Line
          type="monotone"
          dataKey="projected"
          name="Projected"
          stroke={gold}
          strokeWidth={2.5}
          strokeDasharray="6 5"
          connectNulls
          dot={false}
          animationDuration={1100}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ----------------- Score distribution (histogram) ----------------- */
export function DistributionBars({
  data,
  height = 170,
}: {
  data: { bucket: string; count: number }[];
  height?: number;
}) {
  // Bucket midpoints drive the color so the histogram reads left-to-right
  // exactly like every score in the app: coral, amber, teal, sage.
  const mid = [20, 47, 62, 75, 85, 95];
  const animKey = data.map((d) => d.count).join(",");
  return (
    <ResponsiveContainer key={animKey} width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: -26 }}>
        <CartesianGrid stroke={grid} strokeDasharray="4 6" vertical={false} />
        <XAxis
          dataKey="bucket"
          tick={{ fill: ink2, fontSize: 11, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis hide domain={[0, "dataMax + 1"]} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(27,32,48,0.04)" }} />
        <Bar dataKey="count" name="Answers" radius={[6, 6, 0, 0]} maxBarSize={44} animationDuration={900}>
          {data.map((_, i) => (
            <Cell key={i} fill={vividScore(mid[i] ?? 60)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ----------------- Sparkline (mini trend) ----------------- */
export function Sparkline({
  values,
  width = 96,
  height = 30,
  color,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const data = values.map((v, i) => ({ i, v }));
  const stroke = color ?? vividScore(values[values.length - 1] ?? 0);
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
        <YAxis domain={["dataMin - 6", "dataMax + 6"]} hide />
        <Line
          type="monotone"
          dataKey="v"
          stroke={stroke}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ----------------- Donut (composition / distribution) -----------------
   A ring, not a full pie, so a total or headline can sit in the hole. Slice
   colors come from the data so it matches the rest of the palette. */
export function DonutChart({
  data,
  height = 220,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const animKey = data.map((d) => d.value).join(",");
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer key={animKey} width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="none"
            animationDuration={900}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            iconSize={8}
            formatter={(v: string) => <span style={{ color: ink2, fontSize: 12 }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerValue || centerLabel) && (
        <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center" style={{ top: height / 2 - 34 }}>
          {centerValue && <span className="font-mono text-2xl font-semibold text-ink">{centerValue}</span>}
          {centerLabel && <span className="text-2xs uppercase tracking-wider text-ink-3">{centerLabel}</span>}
          {!centerValue && total > 0 && <span className="font-mono text-2xl font-semibold text-ink">{total}</span>}
        </div>
      )}
    </div>
  );
}

/* ----------------- Horizontal bars (ranked breakdown) -----------------
   Reads top-to-bottom like a leaderboard; each bar colored by its score. */
export function HBarChart({
  data,
  height = 220,
  max = 100,
}: {
  data: { label: string; value: number }[];
  height?: number;
  max?: number;
}) {
  const animKey = data.map((d) => Math.round(d.value)).join(",");
  return (
    <ResponsiveContainer key={animKey} width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={grid} strokeDasharray="4 6" horizontal={false} />
        <XAxis type="number" domain={[0, max]} hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: ink2, fontSize: 12, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
          width={92}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(27,32,48,0.04)" }} />
        <Bar dataKey="value" name="Score" radius={[0, 6, 6, 0]} maxBarSize={22} animationDuration={900}>
          {data.map((d, i) => (
            <Cell key={i} fill={vividScore(d.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
