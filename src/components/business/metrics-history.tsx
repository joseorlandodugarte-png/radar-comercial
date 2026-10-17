"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatShortDate } from "@/lib/format";

export function FollowersChart({
  points,
}: {
  points: { date: string; followers: number | null }[];
}) {
  const data = points
    .filter((p) => p.followers !== null)
    .map((p) => ({ ...p, label: formatShortDate(p.date) }));
  if (data.length < 2) return null;
  return (
    <div className="h-40">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip formatter={(v) => [Number(v).toLocaleString("es-VE"), "Seguidores"]} />
          <Line
            type="monotone"
            dataKey="followers"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
