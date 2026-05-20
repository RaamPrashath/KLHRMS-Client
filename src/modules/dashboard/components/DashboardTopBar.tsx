"use client";

import { useMemo } from "react";

export function DashboardTopBar() {
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  return (
    <div className="flex min-h-10 items-center justify-end border-b border-[#dbe4ef] px-8 text-[#365887]">
      <p className="text-[0.95rem] font-medium">{formattedDate}</p>
    </div>
  );
}
