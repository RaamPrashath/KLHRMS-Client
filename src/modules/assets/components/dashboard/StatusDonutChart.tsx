'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { StatusCount } from './dashboard.types';

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: StatusCount }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white px-3.5 py-2.5 shadow-lg text-[13px]">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
        <span className="font-medium text-[#1d1d1f]">{d.name}</span>
      </div>
      <div className="mt-0.5 text-[#6e6e73]">{d.value} assets</div>
    </div>
  );
}

export function StatusDonutChart({ data }: { data: StatusCount[] }) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[#6e6e73]">
        No asset data yet
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex h-full items-center justify-center gap-10 pt-1 pb-9">
      <div className="w-44 shrink-0">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2.5}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[#1d1d1f]">{d.name}</div>
              <div className="text-[12px] text-[#6e6e73]">
                {d.value} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
