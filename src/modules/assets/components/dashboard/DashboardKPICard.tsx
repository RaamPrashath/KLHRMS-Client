'use client';

import type { ElementType } from 'react';

export function DashboardKPICard({
  value,
  label,
  icon: Icon,
  color,
}: {
  value: number;
  label: string;
  icon: ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[18px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${color}12` }}
      >
        <Icon className="size-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[22px] font-semibold tracking-tight text-[#1d1d1f] tabular-nums">
          {value}
        </div>
        <div className="text-[13px] text-[#6e6e73]">{label}</div>
      </div>
    </div>
  );
}
