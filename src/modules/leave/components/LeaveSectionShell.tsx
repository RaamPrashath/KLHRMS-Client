'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { startOfMonth } from 'date-fns';
import { motion, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ApplyLeaveSheet } from '@/modules/leave/components/ApplyLeaveSheet';
import { HolidayDialog } from '@/modules/leave/components/HolidayDialog';
import { LeaveRequestDetailsDialog } from '@/modules/leave/components/LeaveRequestDetailsDialog';
import { LeaveSidebar, type LeaveSection } from '@/modules/leave/components/LeaveSidebar';
import { LeaveTypeDialog } from '@/modules/leave/components/LeaveTypeDialog';
import { useDeleteHoliday } from '@/modules/leave/hooks/useDeleteHoliday';
import { useHolidays } from '@/modules/leave/hooks/useHolidays';
import { useLeaveTypes } from '@/modules/leave/hooks/useLeaveTypes';
import type { HolidayRecord, LeaveMemberSummary, LeavePermissions, LeaveTypeRecord } from '@/modules/leave/types/leaveTypes';
import { getLeaveErrorMessage } from '@/modules/leave/utils/errorMessage';
import { canApproveLeaves, canCreateLeaves, resolveLeavePermissions } from '@/modules/leave/utils/leavePermissions';

interface LeaveSectionShellProps {
  orgSlug: string;
  memberId: string;
  initialMembers: LeaveMemberSummary[];
  initialPermissions: Record<string, Record<string, string>>;
  children: React.ReactNode;
}

const EMPTY_LEAVE_TYPES: LeaveTypeRecord[] = [];
const EMPTY_HOLIDAYS: HolidayRecord[] = [];

interface LeaveShellContextValue {
  orgSlug: string;
  memberId: string;
  permissions: LeavePermissions;
  canApprove: boolean;
  canCreate: boolean;
  leaveTypes: LeaveTypeRecord[];
  leaveTypesLoading: boolean;
  holidays: HolidayRecord[];
  holidaysLoading: boolean;
  openApplyLeave: () => void;
  openLeaveTypeDialog: (leaveType?: LeaveTypeRecord | null) => void;
  openHolidayDialog: (holiday?: HolidayRecord | null) => void;
  openRequestDetails: (requestId: string) => void;
  deleteHoliday: (holidayId: string) => Promise<void>;
}

const LeaveShellContext = createContext<LeaveShellContextValue | null>(null);

const SECTION_COPY: Record<LeaveSection, { title: string; description: string }> = {
  requests: {
    title: 'Leave Requests',
    description: 'A calm, glanceable queue for upcoming time away and approval decisions.',
  },
  balances: {
    title: 'Leave Balances',
    description: 'Track allocations, carry-forward, and remaining days without the spreadsheet feel.',
  },
  'leave-types': {
    title: 'Leave Types',
    description: 'Shape the policy layer with cleaner categories, quotas, and carry rules.',
  },
  holidays: {
    title: 'Holidays',
    description: 'Keep public holidays visible in one place so planning feels predictable.',
  },
};

function resolveSection(pathname: string): LeaveSection {
  if (pathname.includes('/leaves/balances')) return 'balances';
  if (pathname.includes('/leaves/leave-types')) return 'leave-types';
  if (pathname.includes('/leaves/holidays')) return 'holidays';
  return 'requests';
}

export function useLeaveShell() {
  const context = useContext(LeaveShellContext);
  if (!context) {
    throw new Error('useLeaveShell must be used within LeaveSectionShell');
  }
  return context;
}

export function LeaveSectionShell({
  orgSlug,
  memberId,
  initialMembers,
  initialPermissions,
  children,
}: Readonly<LeaveSectionShellProps>) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const activeSection = resolveSection(pathname);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveTypeDialogOpen, setLeaveTypeDialogOpen] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveTypeRecord | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayRecord | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const leaveTypesQuery = useLeaveTypes(orgSlug, memberId);
  const holidaysQuery = useHolidays(orgSlug, memberId, {
    month: calendarMonth.getMonth() + 1,
    year: calendarMonth.getFullYear(),
  });
  const deleteHolidayMutation = useDeleteHoliday(orgSlug, memberId);

  const permissions: LeavePermissions = resolveLeavePermissions(initialPermissions);
  const canCreate = canCreateLeaves(permissions.create);
  const canApprove = canApproveLeaves(permissions.approve);
  const leaveTypes = leaveTypesQuery.data ?? EMPTY_LEAVE_TYPES;
  const holidays = holidaysQuery.data ?? EMPTY_HOLIDAYS;

  const shellContext = useMemo<LeaveShellContextValue>(
    () => ({
      orgSlug,
      memberId,
      permissions,
      canApprove,
      canCreate,
      leaveTypes,
      leaveTypesLoading: leaveTypesQuery.isLoading,
      holidays,
      holidaysLoading: holidaysQuery.isLoading,
      openApplyLeave: () => setApplyOpen(true),
      openLeaveTypeDialog: (leaveType = null) => {
        setSelectedLeaveType(leaveType);
        setLeaveTypeDialogOpen(true);
      },
      openHolidayDialog: (holiday = null) => {
        setSelectedHoliday(holiday);
        setHolidayDialogOpen(true);
      },
      openRequestDetails: (requestId) => setSelectedRequestId(requestId),
      deleteHoliday: async (holidayId) => {
        try {
          await deleteHolidayMutation.mutateAsync(holidayId);
          toast.success('Holiday deleted');
        } catch (error) {
          toast.error(getLeaveErrorMessage(error, 'Failed to delete holiday'));
        }
      },
    }),
    [
      canApprove,
      canCreate,
      deleteHolidayMutation,
      holidays,
      holidaysQuery.isLoading,
      leaveTypes,
      leaveTypesQuery.isLoading,
      memberId,
      orgSlug,
      permissions,
    ],
  );

  const sectionCopy = SECTION_COPY[activeSection];

  return (
    <LeaveShellContext.Provider value={shellContext}>
      <div className="min-h-dvh bg-white">
        <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
          <LeaveSidebar
            orgSlug={orgSlug}
            activeSection={activeSection}
            canApprove={canApprove}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            holidays={holidays}
          />

          <main className="min-w-0 flex-1 bg-white p-6 sm:p-8 lg:p-10">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h1 className="text-3xl font-medium tracking-tight text-neutral-900">{sectionCopy.title}</h1>
                  <p className="mt-2 max-w-2xl text-sm text-neutral-500">{sectionCopy.description}</p>
                </div>

                {canCreate ? (
                  <Button
                    className="rounded-full bg-primary px-5 text-white shadow-[0_12px_30px_rgba(0,135,74,0.20)] hover:bg-primary-hover"
                    onClick={() => setApplyOpen(true)}
                  >
                    Apply Leave
                  </Button>
                ) : null}
              </header>

              {children}
            </motion.div>
          </main>
        </div>
      </div>

      <ApplyLeaveSheet
        open={applyOpen}
        onOpenChange={setApplyOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        createScope={permissions.create}
        leaveTypes={leaveTypes}
        members={initialMembers}
      />

      <LeaveTypeDialog
        open={leaveTypeDialogOpen}
        onOpenChange={setLeaveTypeDialogOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        leaveType={selectedLeaveType}
      />

      <HolidayDialog
        open={holidayDialogOpen}
        onOpenChange={setHolidayDialogOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        holiday={selectedHoliday}
      />

      <LeaveRequestDetailsDialog
        open={selectedRequestId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRequestId(null);
        }}
        orgSlug={orgSlug}
        memberId={memberId}
        leaveRequestId={selectedRequestId}
        permissions={permissions}
      />
    </LeaveShellContext.Provider>
  );
}
