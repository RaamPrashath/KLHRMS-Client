"use client";

import { AttendanceClockCard } from "@/modules/attendance/components/AttendanceClockCard";

interface DashboardClockWidgetProps {
  orgSlug: string;
  memberId: string;
}

export function DashboardClockWidget({
  orgSlug,
  memberId,
}: Readonly<DashboardClockWidgetProps>) {
  return (
    <AttendanceClockCard
      orgSlug={orgSlug}
      memberId={memberId}
      variant="dashboard"
    />
  );
}
