'use client';

import { ArrowLeftRight, Hammer, UserCheck } from 'lucide-react';
import { formatDate } from '@/modules/assets/lib/assetUtils';
import type { RecentActivityItem } from './dashboard.types';

const activityConfig: Record<string, { icon: typeof UserCheck; color: string; bg: string; label: string }> = {
  ASSIGNED: { icon: UserCheck, color: '#2563eb', bg: '#eff6ff', label: 'Assigned' },
  RETURNED: { icon: ArrowLeftRight, color: '#7c3aed', bg: '#f5f3ff', label: 'Returned' },
  MAINTENANCE: { icon: Hammer, color: '#d97706', bg: '#fffbeb', label: 'Maintenance' },
};

export function RecentActivityList({ items }: { items: RecentActivityItem[] }) {
  if (!items.length) {
    return (
      <div className="flex items-center justify-center py-10 text-[13px] text-[#6e6e73]">
        No recent activity
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#eef0f3]">
      {items.map((item, i) => {
        const config = activityConfig[item.type] || activityConfig.MAINTENANCE;
        const Icon = config.icon;
        return (
          <div key={`${item.type}-${item.date}-${i}`} className="flex items-center gap-3.5 px-1 py-3">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: config.bg }}
            >
              <Icon className="size-4" style={{ color: config.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium text-[#1d1d1f]">{item.assetName}</span>
                <span className="text-[11px] text-[#6e6e73] shrink-0">{config.label}</span>
              </div>
              {item.memberName && (
                <div className="text-[12px] text-[#6e6e73]">{item.memberName}</div>
              )}
            </div>
            <div className="text-[11px] text-[#86868b] shrink-0 tabular-nums">
              {formatDate(item.date)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
