'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonthlyTrend } from './dashboard.types';

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white px-3.5 py-2.5 shadow-lg text-[13px]">
      <div className="font-medium text-[#1d1d1f]">{label}</div>
      <div className="mt-0.5 text-[#6e6e73]">{payload[0].value} assets added</div>
    </div>
  );
}

export function MonthlyTrendChart({ data }: { data: MonthlyTrend[] }) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[#6e6e73]">
        No trend data yet
      </div>
    );
  }

  const chartData = data.map((d) => {
    const [y, m] = d.month.split('-');
    const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    return { ...d, shortLabel: `${months[parseInt(m) - 1]} ${y?.slice(2)}` };
  });

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--indigo-9)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--indigo-9)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" vertical={false} />
          <XAxis
            dataKey="shortLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#86868b' }}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#86868b' }}
            allowDecimals={false}
          />
          <Tooltip content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--indigo-9)"
            strokeWidth={2}
            fill="url(#trendFill)"
            activeDot={{ r: 4, fill: 'var(--indigo-9)', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
