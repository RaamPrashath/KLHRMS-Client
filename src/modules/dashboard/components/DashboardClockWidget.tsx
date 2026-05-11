"use client";

import { AttendanceClockCard } from "@/modules/attendance/components/AttendanceClockCard";

interface DashboardClockWidgetProps {
  orgSlug: string;
  memberId: string;
  roleName: string | null;
}

export function DashboardClockWidget({
  orgSlug,
  memberId,
  roleName,
}: Readonly<DashboardClockWidgetProps>) {
  return (
    <AttendanceClockCard
      orgSlug={orgSlug}
      memberId={memberId}
      variant="dashboard"
      roleName={roleName}
    />
  );
}
