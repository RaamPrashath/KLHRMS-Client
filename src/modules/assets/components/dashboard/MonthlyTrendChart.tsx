'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonthlyTrend } from './dashboard.types';

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-lg text-[13px]">
      <div className="font-semibold text-foreground">{label}</div>
      <div className="mt-0.5 text-muted-foreground">{payload[0].value} assets added</div>
    </div>
  );
}

export function MonthlyTrendChart({ data }: { data: MonthlyTrend[] }) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground min-h-[200px]">
        No trend data yet
      </div>
    );
  }

  let chartData = data;
  
  // If only one data point exists, pad it with 2 months before and after so a line can render
  if (data.length === 1) {
    const singlePoint = data[0];
    const [yearStr, monthStr] = singlePoint.month.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const padded = [];
    for (let i = -2; i <= 2; i++) {
      let m = month + i;
      let y = year;
      if (m <= 0) {
        m += 12;
        y -= 1;
      } else if (m > 12) {
        m -= 12;
        y += 1;
      }
      const mStr = m.toString().padStart(2, '0');
      const monthKey = `${y}-${mStr}`;
      
      if (i === 0) {
        padded.push(singlePoint);
      } else {
        padded.push({
          month: monthKey,
          count: 0,
        });
      }
    }
    chartData = padded;
  }

  const formattedChartData = chartData.map((d) => {
    const [y, m] = d.month.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return { ...d, shortLabel: `${months[parseInt(m) - 1]} ${y?.slice(2)}` };
  });

  return (
    <div className="h-[250px] w-full mt-2">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={formattedChartData} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" vertical={false} />
          <XAxis
            dataKey="shortLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-muted-foreground"
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-muted-foreground"
            allowDecimals={false}
          />
          <Tooltip content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#trendFill)"
            activeDot={{ r: 5, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
