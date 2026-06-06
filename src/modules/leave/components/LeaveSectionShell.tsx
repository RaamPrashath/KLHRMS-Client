'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { BarChart3, CalendarDays, History, Landmark, PlaneTakeoff, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApplyLeaveSheet } from '@/modules/leave/components/ApplyLeaveSheet';
import { HolidayDialog } from '@/modules/leave/components/HolidayDialog';
import { LeaveRequestDetailsDialog } from '@/modules/leave/components/LeaveRequestDetailsDialog';
import { LeaveTypeDialog } from '@/modules/leave/components/LeaveTypeDialog';
import { useDeleteHoliday } from '@/modules/leave/hooks/useDeleteHoliday';
import { useHolidays } from '@/modules/leave/hooks/useHolidays';
import { useLeaveTypes } from '@/modules/leave/hooks/useLeaveTypes';
import { useSyncHolidays } from '@/modules/leave/hooks/useSyncHolidays';
import type { HolidayRecord, LeaveMemberSummary, LeavePermissions, LeaveTypeRecord } from '@/modules/leave/types/leaveTypes';
import { getLeaveErrorMessage } from '@/modules/leave/utils/errorMessage';
import { canApproveLeaves, canCreateLeaves, canSyncHolidays, resolveLeavePermissions } from '@/modules/leave/utils/leavePermissions';

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
  canSync: boolean;
  members: LeaveMemberSummary[];
  leaveTypes: LeaveTypeRecord[];
  leaveTypesLoading: boolean;
  holidays: HolidayRecord[];
  holidaysLoading: boolean;
  openApplyLeave: () => void;
  openLeaveTypeDialog: (leaveType?: LeaveTypeRecord | null) => void;
  openHolidayDialog: (holiday?: HolidayRecord | null) => void;
  openRequestDetails: (requestId: string) => void;
  deleteHoliday: (holidayId: string) => Promise<void>;
  syncHolidays: () => Promise<void>;
}

const LeaveShellContext = createContext<LeaveShellContextValue | null>(null);

export type LeaveSection = 'requests' | 'balances' | 'leave-types' | 'holidays' | 'summary' | 'history';

interface TabItem {
  key: LeaveSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const TABS: TabItem[] = [
  { key: 'requests', label: 'Requests', icon: PlaneTakeoff },
  { key: 'balances', label: 'Balances', icon: Landmark },
  { key: 'leave-types', label: 'Leave Types', icon: Sparkles, adminOnly: true },
  { key: 'holidays', label: 'Holidays', icon: CalendarDays, adminOnly: true },
  { key: 'summary', label: 'Summary', icon: BarChart3, adminOnly: true },
  { key: 'history', label: 'History', icon: History },
];

const SECTION_COPY: Record<LeaveSection, { title: string; description: string }> = {
  requests: {
    title: 'Leave Requests',
    description: '',
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
  summary: {
    title: 'Leave Summary',
    description: 'Overview of approved leave days taken by each employee.',
  },
  history: {
    title: 'Leave History',
    description: 'Complete record of all leave requests across the organization.',
  },
};

function resolveSection(pathname: string): LeaveSection {
  if (pathname.includes('/leaves/history')) return 'history';
  if (pathname.includes('/leaves/summary')) return 'summary';
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
  const activeSection = resolveSection(pathname);
  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveTypeDialogOpen, setLeaveTypeDialogOpen] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveTypeRecord | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayRecord | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const leaveTypesQuery = useLeaveTypes(orgSlug, memberId);
  const holidaysQuery = useHolidays(orgSlug, memberId);
  const deleteHolidayMutation = useDeleteHoliday(orgSlug, memberId);
  const syncHolidaysMutation = useSyncHolidays(orgSlug, memberId);
  const deleteHolidayMutationAsync = deleteHolidayMutation.mutateAsync;
  const syncHolidaysMutationAsync = syncHolidaysMutation.mutateAsync;

  const permissions: LeavePermissions = useMemo(
    () => resolveLeavePermissions(initialPermissions),
    [initialPermissions],
  );
  const canCreate = canCreateLeaves(permissions.create);
  const canApprove = canApproveLeaves(permissions.approve);
  const canSync = canSyncHolidays(permissions.create);
  const leaveTypes = leaveTypesQuery.data ?? EMPTY_LEAVE_TYPES;
  const holidays = holidaysQuery.data ?? EMPTY_HOLIDAYS;

  const openApplyLeave = useCallback(() => setApplyOpen(true), []);
  const openLeaveTypeDialog = useCallback((leaveType: LeaveTypeRecord | null = null) => {
    setSelectedLeaveType(leaveType);
    setLeaveTypeDialogOpen(true);
  }, []);
  const openHolidayDialog = useCallback((holiday: HolidayRecord | null = null) => {
    setSelectedHoliday(holiday);
    setHolidayDialogOpen(true);
  }, []);
  const openRequestDetails = useCallback((requestId: string) => setSelectedRequestId(requestId), []);
  const deleteHoliday = useCallback(
    async (holidayId: string) => {
      try {
        await deleteHolidayMutationAsync(holidayId);
        toast.success('Holiday deleted');
      } catch (error) {
        toast.error(getLeaveErrorMessage(error, 'Failed to delete holiday'));
      }
    },
    [deleteHolidayMutationAsync],
  );
  const syncHolidays = useCallback(async () => {
    try {
      const result = await syncHolidaysMutationAsync();
      toast.success(
        result.rows_inserted > 0
          ? `Synced ${result.rows_inserted} holiday${result.rows_inserted === 1 ? '' : 's'} from ${result.source === 'api' ? 'public API' : 'master list'}`
          : 'Holidays already up to date',
      );
    } catch (error) {
      toast.error(getLeaveErrorMessage(error, 'Failed to sync holidays'));
    }
  }, [syncHolidaysMutationAsync]);

  const shellContext = useMemo<LeaveShellContextValue>(
    () => ({
      orgSlug,
      memberId,
      permissions,
      canApprove,
      canCreate,
      canSync,
      members: initialMembers,
      leaveTypes,
      leaveTypesLoading: leaveTypesQuery.isLoading,
      holidays,
      holidaysLoading: holidaysQuery.isLoading,
      openApplyLeave,
      openLeaveTypeDialog,
      openHolidayDialog,
      openRequestDetails,
      deleteHoliday,
      syncHolidays,
    }),
    [
      canApprove, canCreate, canSync, deleteHoliday, initialMembers, syncHolidays,
      holidays, holidaysQuery.isLoading, leaveTypes, leaveTypesQuery.isLoading,
      memberId, openApplyLeave, openHolidayDialog, openLeaveTypeDialog, openRequestDetails, orgSlug, permissions,
    ],
  );

  const sectionCopy = SECTION_COPY[activeSection];
  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || canApprove);

  return (
    <LeaveShellContext.Provider value={shellContext}>
      <div className="flex flex-col gap-6 flex-1 min-h-full">
        <div className="ml-7 mt-7 mr-7">
          <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">
            {sectionCopy.title}
          </h1>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="mx-7 mt-2 flex items-center justify-between gap-4">
          <div className="mt-2 flex items-center self-start rounded-xl bg-neutral-50 p-1 border border-black/4">
            {visibleTabs.map((tab) => {
              const isActive = tab.key === activeSection;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.key}
                  href={`/${orgSlug}/leaves/${tab.key}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-4 text-[13px] font-medium rounded-lg transition-all duration-200 ease-out',
                    isActive
                      ? 'bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                      : 'text-neutral-500 hover:text-neutral-900',
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
          {canCreate && (
            <Button
              className="h-9 shrink-0 rounded-lg bg-gradient-to-br from-[#3862f6] to-[#6366f1] px-4 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(56,98,246,0.15)]"
              onClick={() => setApplyOpen(true)}
            >
              Apply Leave
            </Button>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="mx-7 mb-7">
          {children}
        </div>
      </div>

      <ApplyLeaveSheet open={applyOpen} onOpenChange={setApplyOpen} orgSlug={orgSlug} memberId={memberId} leaveTypes={leaveTypes} />
      <LeaveTypeDialog
        open={leaveTypeDialogOpen}
        onOpenChange={setLeaveTypeDialogOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        leaveType={selectedLeaveType}
      />
      <HolidayDialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen} orgSlug={orgSlug} memberId={memberId} holiday={selectedHoliday} />
      <LeaveRequestDetailsDialog open={selectedRequestId !== null} onOpenChange={(open) => { if (!open) setSelectedRequestId(null); }} orgSlug={orgSlug} memberId={memberId} leaveRequestId={selectedRequestId} permissions={permissions} />
    </LeaveShellContext.Provider>
  );
}
