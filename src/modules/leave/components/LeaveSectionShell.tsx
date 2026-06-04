'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { CalendarDays, Landmark, PlaneTakeoff, Sparkles } from 'lucide-react';

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

export type LeaveSection = 'requests' | 'balances' | 'leave-types' | 'holidays';

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

  const permissions: LeavePermissions = resolveLeavePermissions(initialPermissions);
  const canCreate = canCreateLeaves(permissions.create);
  const canApprove = canApproveLeaves(permissions.approve);
  const canSync = canSyncHolidays(permissions.create);
  const leaveTypes = leaveTypesQuery.data ?? EMPTY_LEAVE_TYPES;
  const holidays = holidaysQuery.data ?? EMPTY_HOLIDAYS;

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
      syncHolidays: async () => {
        try {
          const result = await syncHolidaysMutation.mutateAsync();
          toast.success(
            result.rows_inserted > 0
              ? `Synced ${result.rows_inserted} holiday${result.rows_inserted === 1 ? '' : 's'} from ${result.source === 'api' ? 'public API' : 'master list'}`
              : 'Holidays already up to date',
          );
        } catch (error) {
          toast.error(getLeaveErrorMessage(error, 'Failed to sync holidays'));
        }
      },
    }),
    [
      canApprove, canCreate, canSync, deleteHolidayMutation, initialMembers, syncHolidaysMutation,
      holidays, holidaysQuery.isLoading, leaveTypes, leaveTypesQuery.isLoading,
      memberId, orgSlug, permissions,
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
              className="h-9 shrink-0 bg-primary px-4 text-[13px] font-medium text-white shadow-[0_12px_30px_rgba(0,135,74,0.20)] hover:bg-primary-hover"
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

      <ApplyLeaveSheet open={applyOpen} onOpenChange={setApplyOpen} orgSlug={orgSlug} memberId={memberId} createScope={permissions.create} leaveTypes={leaveTypes} members={initialMembers} />
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
