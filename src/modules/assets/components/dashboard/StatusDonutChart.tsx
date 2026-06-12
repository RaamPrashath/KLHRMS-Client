'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { StatusCount } from './dashboard.types';
import { cn } from '@/lib/utils';

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: StatusCount }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-lg text-[13px] pointer-events-none z-50">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
        <span className="font-semibold text-foreground">{d.name}</span>
      </div>
      <div className="mt-0.5 text-muted-foreground font-medium">{d.value} assets</div>
    </div>
  );
}

const getStatusColor = (name: string, defaultColor: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('available')) return '#10b981'; // Emerald
  if (lower.includes('maintenance')) return '#f59e0b'; // Amber
  if (lower.includes('assigned') || lower.includes('issued')) return '#3b82f6'; // Blue
  return defaultColor;
};

export function StatusDonutChart({ data }: { data: StatusCount[] }) {
  const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null);

  if (!data.length) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center text-[13px] text-muted-foreground">
        No asset data yet
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  // Map legend labels to look friendly and match colors
  const mappedData = data.map((d) => ({
    ...d,
    color: getStatusColor(d.name, d.color),
  }));

  return (
    <div className="flex flex-col justify-between h-full gap-4">
      {/* Centered Donut with Absolute Asset Count inside */}
      <div className="relative flex items-center justify-center my-4 h-40">
        <div
          className="w-40 h-40"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            // Center is exactly 80px (half of 160px container width)
            setHoveredSide(mouseX < 80 ? 'left' : 'right');
          }}
          onMouseLeave={() => setHoveredSide(null)}
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Pie
                data={mappedData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {mappedData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={<DonutTooltip />}
                allowEscapeViewBox={{ x: true, y: true }}
                position={
                  hoveredSide === 'left'
                    ? { x: -80, y: 35 }
                    : hoveredSide === 'right'
                      ? { x: 120, y: 35 }
                      : undefined
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="absolute text-center flex flex-col items-center justify-center pointer-events-none select-none">
          <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{total}</span>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mt-0.5">Assets</p>
        </div>
      </div>

      {/* Legend list of hoverable status cards */}
      <div className="space-y-1.5">
        {mappedData.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div
              key={d.name}
              className="flex items-center justify-between text-xs p-2 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-slate-600 dark:text-slate-300 font-semibold">{d.name}</span>
              </div>
              <span className="font-bold text-slate-850 dark:text-slate-200 font-mono">
                {d.value} <span className="text-[10px] text-muted-foreground font-normal ml-0.5">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
