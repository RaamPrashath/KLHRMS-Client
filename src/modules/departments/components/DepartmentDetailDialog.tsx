'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DepartmentSummary } from '@/modules/departments/types/departmentTypes';

function formatStatus(status: 'ACTIVE' | 'INACTIVE') {
  return status === 'ACTIVE'
    ? 'bg-[#00874A]/[0.08] text-[#00874A] border border-[#00874A]/10'
    : 'bg-neutral-100 text-neutral-500 border border-neutral-200';
}

function OverviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#e5e5ea] py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">{label}</p>
      <p className="mt-1 text-[15px] leading-6 text-[#1d1d1f]">{value}</p>
    </div>
  );
}

interface DepartmentDetailDialogProps {
  department: DepartmentSummary | null;
  isOpen: boolean;
  canManage: boolean;
  onClose: () => void;
  onCreateTeam: () => void;
  onDelete: () => void;
  onViewTeams: () => void;
}

export function DepartmentDetailDialog({
  department,
  isOpen,
  canManage,
  onClose,
  onCreateTeam,
  onDelete,
  onViewTeams,
}: DepartmentDetailDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl border border-[#e5e5ea] bg-white p-0 shadow-2xl rounded-[18px] overflow-hidden">
        <DialogTitle className="sr-only">
          {department ? `${department.name} department details` : 'Department details'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {department
            ? `View the overview, staffing, and status details for the ${department.name} department.`
            : 'View department details.'}
        </DialogDescription>
        {!department ? (
          <div className="px-8 py-10">
            <p className="text-[15px] text-[#6e6e73]">Unable to load department details.</p>
          </div>
        ) : (
          <>
            <div className="border-b border-[#e5e5ea] px-8 py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">
                    Department
                  </p>
                  <h2 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f]">{department.name}</h2>
                </div>
                <Badge className={cn('mt-1 shrink-0 rounded-lg px-3 py-1 text-[11px] font-medium', formatStatus(department.status))}>
                  {department.status}
                </Badge>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73]">
                Led by {department.headMemberName || 'no assigned lead'}.
              </p>
            </div>

            <div className="px-8 py-6">
              <div className="grid grid-cols-2 gap-x-12 gap-y-0">
                <OverviewField label="Department lead" value={department.headMemberName || 'Not assigned'} />
                <OverviewField label="Parent department" value={department.parentDepartmentId || 'Top-level'} />
                <OverviewField label="Teams" value={`${department.teamCount}`} />
                <OverviewField label="People" value={`${department.memberCount}`} />
                <OverviewField label="Projects" value={`${department.projectCount}`} />
                <OverviewField label="Status" value={department.status} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#e5e5ea] px-8 py-4">
              <Button
                variant="outline"
                className="rounded-lg border-[#e5e5ea] px-5 text-[14px] font-medium text-[#1d1d1f]"
                onClick={onViewTeams}
              >
                View teams
                <ChevronRight className="ml-1 size-4" />
              </Button>
              {canManage && (
                <>
                  <Button
                    className="rounded-lg px-5 text-[14px] font-medium"
                    onClick={onCreateTeam}
                  >
                    Add team
                  </Button>
                  <div className="ml-auto">
                    <Button
                      variant="destructive"
                      className="rounded-lg px-5 text-[14px] font-medium"
                      onClick={onDelete}
                    >
                      Remove
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
