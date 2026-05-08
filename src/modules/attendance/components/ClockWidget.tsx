"use client";

import { AttendanceClockCard } from "@/modules/attendance/components/AttendanceClockCard";

interface ClockWidgetProps {
  orgSlug: string;
  memberId: string;
}

export function ClockWidget({ orgSlug, memberId }: Readonly<ClockWidgetProps>) {
  return (
    <AttendanceClockCard
      orgSlug={orgSlug}
      memberId={memberId}
      variant="attendance"
    />
  );
}
