'use client';

import { createContext, useContext } from 'react';
import type { AttendancePermissions } from '@/modules/attendance/types/attendanceTypes';

interface AttendanceRouteContextValue {
  orgSlug: string;
  memberId: string;
  permissions: AttendancePermissions;
}

const AttendanceRouteContext = createContext<AttendanceRouteContextValue | null>(null);

export function AttendanceRouteProvider({
  value,
  children,
}: Readonly<{
  value: AttendanceRouteContextValue;
  children: React.ReactNode;
}>) {
  return (
    <AttendanceRouteContext.Provider value={value}>
      {children}
    </AttendanceRouteContext.Provider>
  );
}

export function useAttendanceRouteContext() {
  const context = useContext(AttendanceRouteContext);
  if (!context) {
    throw new Error('useAttendanceRouteContext must be used inside AttendanceRouteProvider');
  }
  return context;
}
