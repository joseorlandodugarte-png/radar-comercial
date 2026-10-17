"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrafficLight } from "@/db/schema";
import { TRAFFIC_LIGHT_HEX, TRAFFIC_LIGHT_LABEL } from "@/lib/labels";

const ORDER: TrafficLight[] = ["red", "no_social", "yellow", "green", "unknown"];

export function LightDonut({
  byLight,
  total,
}: {
  byLight: Record<TrafficLight, number>;
  total: number;
}) {
  const data = ORDER.map((l) => ({
    key: l,
    name: TRAFFIC_LIGHT_LABEL[l],
    value: byLight[l],
  })).filter((d) => d.value > 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-36 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={TRAFFIC_LIGHT_HEX[d.key]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [`${v} negocios`, ""]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-muted-foreground text-[11px]">negocios</span>
        </div>
      </div>
      <ul className="grid flex-1 gap-1.5 text-sm">
        {ORDER.map((l) => (
          <li key={l} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ background: TRAFFIC_LIGHT_HEX[l] }}
              />
              {TRAFFIC_LIGHT_LABEL[l]}
            </span>
            <span className="font-medium tabular-nums">{byLight[l]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CategoryBars({
  data,
}: {
  data: { name: string; total: number; red: number; noSocial: number }[];
}) {
  const rows = data
    .map((d) => ({
      name: d.name,
      "Rojo o sin redes": d.red + d.noSocial,
      Resto: d.total - d.red - d.noSocial,
    }))
    .sort((a, b) => b["Rojo o sin redes"] + b.Resto - (a["Rojo o sin redes"] + a.Resto));
  return (
    <div style={{ height: Math.max(160, rows.length * 34) }}>
      <ResponsiveContainer>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 0, right: 8, top: 0, bottom: 0 }}
          barCategoryGap={6}
        >
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <Tooltip cursor={{ fill: "var(--muted)" }} />
          <Bar
            dataKey="Rojo o sin redes"
            stackId="a"
            fill={TRAFFIC_LIGHT_HEX.red}
            radius={[4, 0, 0, 4]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="Resto"
            stackId="a"
            fill="var(--muted-foreground)"
            fillOpacity={0.25}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
