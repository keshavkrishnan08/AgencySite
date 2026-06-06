"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
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
import { scoreColor } from "@/lib/utils";

const ink = "#1b2030";
const ink2 = "#585e70";
const grid = "#ece7da";
const primary = "#14808e";
const primaryBright = "#19a9b8";
const sage = "#3e9d6e";

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
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color || primary }} />
          {p.name}: <span style={{ color: scoreColor(p.value) }}>{p.value}</span>
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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="progFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryBright} stopOpacity={0.22} />
            <stop offset="100%" stopColor={primaryBright} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="progStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={primaryBright} />
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
          dot={{ fill: "#fff", stroke: primary, strokeWidth: 2.5, r: 4 }}
          activeDot={{ fill: primary, stroke: "#fff", strokeWidth: 3, r: 6 }}
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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryBright} stopOpacity={0.32} />
            <stop offset="100%" stopColor={primary} stopOpacity={0.14} />
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
          stroke={primary}
          strokeWidth={2.5}
          fill="url(#radarFill)"
          dot={{ fill: primary, stroke: "#fff", strokeWidth: 1.5, r: 3 }}
          animationDuration={900}
        />
        <Tooltip content={<ChartTooltip />} />
      </RadarChart>
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
  const stroke = color ?? scoreColor(values[values.length - 1] ?? 0);
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
