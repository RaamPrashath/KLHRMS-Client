'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Building2, ChevronRight, FolderKanban, Plus, Trash2, UserPlus } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useDepartmentMutations } from '@/modules/departments/hooks/useDepartmentMutations';
import { useDepartmentMetaQuery, useDepartmentsQuery } from '@/modules/departments/hooks/useDepartmentsQuery';
import type { DepartmentInput, TeamInput, TeamMemberInput } from '@/modules/departments/schema/departmentSchemas';
import type {
  DepartmentSummary,
  LookupOption,
  TeamSummary,
} from '@/modules/departments/types/departmentTypes';
import { cn } from '@/lib/utils';

const ACTION_BLUE = '#00874a';

const defaultDepartmentForm: DepartmentInput = {
  name: '',
  headMemberId: '',
  parentDepartmentId: '',
  status: 'ACTIVE',
};

const defaultTeamForm: TeamInput = {
  name: '',
  description: '',
  leadMemberId: '',
  status: 'ACTIVE',
};

function readError(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse((error as Error)?.message ?? '{}');
    return parsed.message || fallback;
  } catch {
    return fallback;
  }
}

function formatStatus(status: 'ACTIVE' | 'INACTIVE') {
  return status === 'ACTIVE'
    ? 'bg-[#eef9f1] text-[#156f3d]'
    : 'bg-[#f5f5f7] text-[#6e6e73]';
}

function RowSkeleton({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-0">
        <Skeleton className="h-16 w-full rounded-none" />
      </TableCell>
    </TableRow>
  );
}

function OverviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#e5e5ea] py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">{label}</p>
      <p className="mt-1 text-[15px] leading-6 text-[#1d1d1f]">{value}</p>
    </div>
  );
}

function updateDepartmentTeam(
  department: DepartmentSummary | null,
  nextTeam: TeamSummary,
) {
  if (!department) return department;
  const nextTeams = department.teams.map((team) => (team.id === nextTeam.id ? nextTeam : team));
  return {
    ...department,
    teams: nextTeams,
    teamCount: nextTeams.length,
    projectCount: nextTeams.reduce((sum, team) => sum + team.projectCount, 0),
    memberCount: nextTeams.reduce((sum, team) => sum + team.memberCount, 0),
  };
}

export function DepartmentsPageShell({
  orgSlug,
  memberId,
  canManageDepartments,
}: {
  orgSlug: string;
  memberId: string;
  canManageDepartments: boolean;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentSummary | null>(null);
  const [departmentForm, setDepartmentForm] = useState<DepartmentInput>(defaultDepartmentForm);
  const [teamForm, setTeamForm] = useState<TeamInput>(defaultTeamForm);
  const [memberForms, setMemberForms] = useState<Record<string, TeamMemberInput>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const shouldReduceMotion = useReducedMotion();

  const departmentsQuery = useDepartmentsQuery(orgSlug, memberId, deferredSearch || undefined);
  const metaQuery = useDepartmentMetaQuery(orgSlug, memberId, canManageDepartments);
  const mutations = useDepartmentMutations(orgSlug, memberId);

  const departments = useMemo(() => departmentsQuery.data?.items ?? [], [departmentsQuery.data?.items]);
  const filteredDepartments = useMemo(() => {
    if (statusFilter === 'ALL') return departments;
    return departments.filter((department) => department.status === statusFilter);
  }, [departments, statusFilter]);

  const stats = useMemo(
    () => ({
      total: departments.length,
      active: departments.filter((department) => department.status === 'ACTIVE').length,
      inactive: departments.filter((department) => department.status === 'INACTIVE').length,
      teams: departments.reduce((sum, department) => sum + department.teamCount, 0),
    }),
    [departments],
  );

  function openDepartmentDetails(department: DepartmentSummary) {
    setSelectedDepartment(department);
    setActiveDepartmentId(department.id);
    setDetailOpen(true);
  }

  function openDepartmentCreateDialog() {
    setDepartmentForm(defaultDepartmentForm);
    setDepartmentDialogOpen(true);
  }

  function openTeamCreateDialog(departmentId: string) {
    setActiveDepartmentId(departmentId);
    setTeamForm(defaultTeamForm);
    setTeamDialogOpen(true);
  }

  async function handleSaveDepartment() {
    try {
      const created = await mutations.createDepartment.mutateAsync(departmentForm);
      setSelectedDepartment(created);
      setActiveDepartmentId(created.id);
      setDepartmentDialogOpen(false);
      setDetailOpen(true);
      setDepartmentForm(defaultDepartmentForm);
      toast.success('Department created');
    } catch (error) {
      toast.error(readError(error, 'Failed to create department'));
    }
  }

  async function handleSaveTeam() {
    if (!activeDepartmentId) return;
    try {
      const updatedDepartment = await mutations.createTeam.mutateAsync({
        departmentId: activeDepartmentId,
        data: teamForm,
      });
      setSelectedDepartment(updatedDepartment);
      setTeamDialogOpen(false);
      setTeamsOpen(true);
      setDetailOpen(false);
      setTeamForm(defaultTeamForm);
      toast.success('Team created');
    } catch (error) {
      toast.error(readError(error, 'Failed to create team'));
    }
  }

  async function handleDeleteDepartment() {
    if (!deleteId) return;
    try {
      await mutations.deleteDepartment.mutateAsync(deleteId);
      setDeleteId(null);
      setDetailOpen(false);
      setTeamsOpen(false);
      toast.success('Department removed');
    } catch (error) {
      toast.error(readError(error, 'Failed to remove department'));
    }
  }

  async function handleAssignMember(teamId: string) {
    const teamMember = memberForms[teamId];
    if (!teamMember?.memberId) return;
    try {
      const updatedTeam = await mutations.assignTeamMember.mutateAsync({ teamId, data: teamMember });
      setSelectedDepartment((current) => updateDepartmentTeam(current, updatedTeam));
      setMemberForms((current) => ({ ...current, [teamId]: { memberId: '', role: '' } }));
      toast.success('Employee assigned');
    } catch (error) {
      toast.error(readError(error, 'Failed to assign employee'));
    }
  }

  async function handleRemoveMember(teamId: string, targetMemberId: string) {
    try {
      const updatedTeam = await mutations.removeTeamMember.mutateAsync({ teamId, targetMemberId });
      setSelectedDepartment((current) => updateDepartmentTeam(current, updatedTeam));
      toast.success('Employee removed');
    } catch (error) {
      toast.error(readError(error, 'Failed to remove employee'));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">Organization</p>
          <h1 className="mt-2 text-[40px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Departments</h1>
        </div>
        {canManageDepartments && (
          <Button
            onClick={openDepartmentCreateDialog}
            className="h-11 rounded-full px-5 text-[15px] font-medium text-white"
            style={{ backgroundColor: ACTION_BLUE }}
          >
            <Plus className="mr-2 size-4" />
            Create department
          </Button>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'ACTIVE', label: 'Active', count: stats.active },
            { value: 'INACTIVE', label: 'Inactive', count: stats.inactive },
            { value: 'ALL', label: 'All', count: stats.total },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value as 'ACTIVE' | 'INACTIVE' | 'ALL')}
              className={cn(
                'min-h-11 rounded-full border px-4 text-[14px] font-medium transition-colors',
                statusFilter === option.value
                  ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white'
                  : 'border-[#e5e5ea] bg-white text-[#1d1d1f]',
              )}
            >
              {option.label}
              <span className="ml-2 text-[#86868b]">{option.count}</span>
            </button>
          ))}
          <span className="inline-flex min-h-11 items-center border border-[#e5e5ea] px-4 text-[14px] text-[#6e6e73]">
            Teams
            <span className="ml-2 text-[#1d1d1f]">{stats.teams}</span>
          </span>
        </div>

        <div className="w-full lg:max-w-sm">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search department or lead"
            className="h-11 rounded-full border-[#e5e5ea] bg-white px-4 text-[15px] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
          />
        </div>
      </div>

      <div className="overflow-hidden border border-[#e5e5ea] bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-[#e5e5ea] bg-[#f5f5f7] hover:bg-[#f5f5f7]">
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                Department
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                Lead
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                Teams
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                People
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                Projects
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                Status
              </TableHead>
              <TableHead className="h-12 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                Open
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departmentsQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, index) => <RowSkeleton key={index} colSpan={7} />)
            ) : filteredDepartments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-16 text-center">
                  <Building2 className="mx-auto size-8 text-[#86868b]" />
                  <p className="mt-3 text-[15px] font-medium text-[#1d1d1f]">No departments match this view</p>
                  <p className="mt-1 text-[14px] text-[#6e6e73]">Try another search or create a department.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredDepartments.map((department) => (
                <motion.tr
                  key={department.id}
                  initial={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => openDepartmentDetails(department)}
                  className="cursor-pointer border-[#e5e5ea] transition-colors hover:bg-[#f5f5f7]"
                >
                  <TableCell className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center border border-[#e5e5ea] bg-white text-[#1d1d1f]">
                        <Building2 className="size-4" />
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">{department.name}</p>
                        <p className="text-[13px] text-[#6e6e73]">
                          {department.parentDepartmentId ? 'Nested department' : 'Top-level department'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-[14px] text-[#1d1d1f]">
                    {department.headMemberName || 'Not assigned'}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-[14px] text-[#1d1d1f]">{department.teamCount}</TableCell>
                  <TableCell className="px-4 py-4 text-[14px] text-[#1d1d1f]">{department.memberCount}</TableCell>
                  <TableCell className="px-4 py-4 text-[14px] text-[#1d1d1f]">{department.projectCount}</TableCell>
                  <TableCell className="px-4 py-4">
                    <Badge className={cn('rounded-full px-3 py-1 text-[11px] font-medium', formatStatus(department.status))}>
                      {department.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-right">
                    <Button variant="ghost" className="h-9 px-3 text-[#1d1d1f]">
                      View
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
        <DialogContent className="max-w-2xl border border-[#e5e5ea] bg-white p-0 shadow-2xl rounded-[18px] overflow-hidden">
          <DialogHeader className="border-b border-[#e5e5ea] px-6 py-5">
            <DialogTitle className="text-[24px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
              Create department
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-6 text-[#6e6e73]">
              Create the department and move straight into its team structure without waiting on a page reload.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="department-name">Department name</Label>
              <Input
                id="department-name"
                value={departmentForm.name}
                onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })}
                className="h-11 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
              />
            </div>

            <div className="grid gap-2">
              <Label>Department lead</Label>
              <Select
                value={departmentForm.headMemberId || 'none'}
                onValueChange={(value) =>
                  setDepartmentForm({ ...departmentForm, headMemberId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger className="h-11 rounded-lg border-[#e5e5ea] shadow-none">
                  <SelectValue placeholder="Select department lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {metaQuery.data?.members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="border-t border-[#e5e5ea] px-6 py-4">
            <Button variant="ghost" onClick={() => setDepartmentDialogOpen(false)} className="rounded-full px-5">
              Cancel
            </Button>
            <Button
              onClick={handleSaveDepartment}
              disabled={mutations.createDepartment.isPending}
              style={{ backgroundColor: ACTION_BLUE }}
              className="rounded-full px-6 text-white"
            >
              {mutations.createDepartment.isPending ? 'Creating...' : 'Create and open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="max-w-2xl border border-[#e5e5ea] bg-white p-0 shadow-2xl rounded-[18px] overflow-hidden">
          <DialogHeader className="border-b border-[#e5e5ea] px-6 py-5">
            <DialogTitle className="text-[24px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
              Create team
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-6 text-[#6e6e73]">
              Add a team under the selected department and continue directly into team staffing.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={teamForm.name}
                onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })}
                className="h-11 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
              />
            </div>

            <div className="grid gap-2">
              <Label>Team lead</Label>
              <Select
                value={teamForm.leadMemberId || 'none'}
                onValueChange={(value) =>
                  setTeamForm({ ...teamForm, leadMemberId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger className="h-11 rounded-lg border-[#e5e5ea] shadow-none">
                  <SelectValue placeholder="Select team lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {metaQuery.data?.members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="team-description">Purpose</Label>
              <Textarea
                id="team-description"
                value={teamForm.description || ''}
                onChange={(event) => setTeamForm({ ...teamForm, description: event.target.value })}
                className="min-h-28 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-[#e5e5ea] px-6 py-4">
            <Button variant="ghost" onClick={() => setTeamDialogOpen(false)} className="rounded-full px-5">
              Cancel
            </Button>
            <Button
              onClick={handleSaveTeam}
              disabled={mutations.createTeam.isPending}
              style={{ backgroundColor: ACTION_BLUE }}
              className="rounded-full px-6 text-white"
            >
              {mutations.createTeam.isPending ? 'Creating...' : 'Create and open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DepartmentDetailDialog
        department={selectedDepartment}
        isOpen={detailOpen}
        canManage={canManageDepartments}
        onClose={() => setDetailOpen(false)}
        onDelete={() => {
          setDeleteId(selectedDepartment?.id ?? null);
          setDetailOpen(false);
        }}
        onCreateTeam={() => selectedDepartment && openTeamCreateDialog(selectedDepartment.id)}
        onViewTeams={() => {
          setDetailOpen(false);
          setTeamsOpen(true);
        }}
      />

      <DepartmentTeamsDialog
        department={selectedDepartment}
        isOpen={teamsOpen}
        canManage={canManageDepartments}
        members={metaQuery.data?.members ?? []}
        memberForms={memberForms}
        setMemberForms={setMemberForms}
        onAssignMember={handleAssignMember}
        onClose={() => setTeamsOpen(false)}
        onRemoveMember={handleRemoveMember}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border border-[#e5e5ea] bg-white shadow-2xl rounded-[18px] overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[24px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
              Remove department
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] leading-6 text-[#6e6e73]">
              This removes the department from active use. Teams and assignments should be reviewed before you continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-6 py-4">
            <AlertDialogCancel className="rounded-full px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDepartment}
              className="rounded-full px-6 bg-[#1d1d1f] text-white hover:bg-[#1d1d1f]"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DepartmentDetailDialog({
  department,
  isOpen,
  canManage,
  onClose,
  onCreateTeam,
  onDelete,
  onViewTeams,
}: {
  department: DepartmentSummary | null;
  isOpen: boolean;
  canManage: boolean;
  onClose: () => void;
  onCreateTeam: () => void;
  onDelete: () => void;
  onViewTeams: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl border border-[#e5e5ea] bg-white p-0 shadow-2xl rounded-[18px] overflow-hidden">
        {!department ? (
          <div className="px-8 py-10">
            <p className="text-[15px] text-[#6e6e73]">Unable to load department details.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-[#e5e5ea] px-8 py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">
                    Department
                  </p>
                  <h2 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f]">{department.name}</h2>
                </div>
                <Badge className={cn('mt-1 shrink-0 rounded-full px-3 py-1 text-[11px] font-medium', formatStatus(department.status))}>
                  {department.status}
                </Badge>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73]">
                Led by {department.headMemberName || 'no assigned lead'}.
              </p>
            </div>

            {/* Overview grid */}
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

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[#e5e5ea] px-8 py-4">
              <Button
                variant="outline"
                className="rounded-full border-[#e5e5ea] px-5 text-[14px] font-medium text-[#1d1d1f]"
                onClick={onViewTeams}
              >
                View teams
                <ChevronRight className="ml-1 size-4" />
              </Button>
              {canManage && (
                <>
                  <Button
                    className="rounded-full px-5 text-[14px] font-medium text-white"
                    style={{ backgroundColor: ACTION_BLUE }}
                    onClick={onCreateTeam}
                  >
                    Add team
                  </Button>
                  <div className="ml-auto">
                    <Button
                      variant="destructive"
                      className="rounded-full text-red px-5 text-[14px] font-medium hover:text-[#1d1d1f]"
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

function DepartmentTeamsDialog({
  department,
  isOpen,
  canManage,
  members,
  memberForms,
  setMemberForms,
  onAssignMember,
  onClose,
  onRemoveMember,
}: {
  department: DepartmentSummary | null;
  isOpen: boolean;
  canManage: boolean;
  members: LookupOption[];
  memberForms: Record<string, TeamMemberInput>;
  setMemberForms: Dispatch<SetStateAction<Record<string, TeamMemberInput>>>;
  onAssignMember: (teamId: string) => Promise<void>;
  onClose: () => void;
  onRemoveMember: (teamId: string, memberId: string) => Promise<void>;
}) {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  const activeTeam = department?.teams.find((team) => team.id === activeTeamId) ?? department?.teams[0] ?? null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[min(60vw,1100px)]! max-w-none! border border-[#e5e5ea] bg-white p-0 shadow-2xl rounded-[18px] overflow-hidden"
      >
        {!department ? (
          <div className="px-8 py-10">
            <p className="text-[15px] text-[#6e6e73]">Unable to load teams for this department.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-[#e5e5ea] px-8 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">Teams and staffing</p>
              <h2 className="mt-1.5 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f]">{department.name}</h2>
            </div>

            {/* Team selector tabs */}
            {department.teams.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-[#e5e5ea] px-8 py-3">
                {department.teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setActiveTeamId(team.id)}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors',
                      activeTeam?.id === team.id
                        ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white'
                        : 'border-[#e5e5ea] bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]',
                    )}
                  >
                    {team.name}
                    <span className={cn('ml-1.5', activeTeam?.id === team.id ? 'text-white/60' : 'text-[#86868b]')}>
                      {team.memberCount}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Content for selected team */}
            <div className="max-h-[60vh] overflow-y-auto">
              {department.teams.length === 0 ? (
                <div className="px-8 py-12 text-center">
                  <Building2 className="mx-auto size-8 text-[#86868b]" />
                  <p className="mt-3 text-[15px] font-medium text-[#1d1d1f]">No teams yet</p>
                  <p className="mt-1 text-[14px] text-[#6e6e73]">Create a team to start adding members.</p>
                </div>
              ) : !activeTeam ? (
                <div className="px-8 py-12 text-center text-[14px] text-[#6e6e73]">
                  Select a team above.
                </div>
              ) : (
                <div className="px-8 py-6 space-y-8">
                  {/* Team info */}
                  <div>
                    <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">{activeTeam.name}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-[#6e6e73]">
                      {activeTeam.description || 'No team description.'} Led by {activeTeam.leadMemberName || 'no assigned lead'}.
                    </p>
                  </div>

                  {/* Members table */}
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                      Members ({activeTeam.memberCount})
                    </p>
                    <div className="overflow-hidden rounded-lg border border-[#e5e5ea]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#e5e5ea] bg-[#f5f5f7] hover:bg-[#f5f5f7]">
                            <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                              Person
                            </TableHead>
                            <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                              Role
                            </TableHead>
                            {canManage && (
                              <TableHead className="h-10 w-[60px] px-4 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]" />
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeTeam.members.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={canManage ? 3 : 2}
                                className="px-4 py-8 text-center text-[13px] text-[#6e6e73]"
                              >
                                No members assigned to this team yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            activeTeam.members.map((member) => (
                              <TableRow key={member.id} className="border-[#e5e5ea]">
                                <TableCell className="px-4 py-3 text-[14px] font-medium text-[#1d1d1f]">
                                  {member.name || member.email || member.memberId}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-[14px] text-[#6e6e73]">
                                  {member.role || 'Contributor'}
                                </TableCell>
                                {canManage && (
                                  <TableCell className="px-4 py-3 text-right">
                                    <Button variant="ghost" size="icon" className="size-8 text-[#86868b] hover:text-[#1d1d1f]" onClick={() => void onRemoveMember(activeTeam.id, member.memberId)}>
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Assign member form */}
                  {canManage && (
                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                        Assign member
                      </p>
                      <div className="flex items-end gap-3">
                        <div className="min-w-0 flex-1">
                          <Select
                            value={memberForms[activeTeam.id]?.memberId || 'none'}
                            onValueChange={(value) =>
                              setMemberForms((current) => ({
                                ...current,
                                [activeTeam.id]: {
                                  ...(current[activeTeam.id] || { role: '' }),
                                  memberId: value === 'none' ? '' : value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-11 rounded-lg border-[#e5e5ea] shadow-none">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select employee</SelectItem>
                              {members.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-40">
                          <Input
                            value={memberForms[activeTeam.id]?.role || ''}
                            onChange={(event) =>
                              setMemberForms((current) => ({
                                ...current,
                                [activeTeam.id]: {
                                  ...(current[activeTeam.id] || { memberId: '' }),
                                  role: event.target.value,
                                },
                              }))
                            }
                            placeholder="Role"
                            className="h-11 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                          />
                        </div>
                        <Button
                          onClick={() => void onAssignMember(activeTeam.id)}
                          className="h-11 shrink-0 rounded-full px-5 text-[14px] font-medium text-white"
                          style={{ backgroundColor: ACTION_BLUE }}
                        >
                          <UserPlus className="mr-2 size-4" />
                          Add
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Linked projects */}
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                      Linked projects ({activeTeam.projectCount})
                    </p>
                    <div className="overflow-hidden rounded-lg border border-[#e5e5ea]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#e5e5ea] bg-[#f5f5f7] hover:bg-[#f5f5f7]">
                            <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                              Project
                            </TableHead>
                            <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeTeam.projects.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="px-4 py-8 text-center text-[13px] text-[#6e6e73]">
                                No projects linked to this team.
                              </TableCell>
                            </TableRow>
                          ) : (
                            activeTeam.projects.map((project) => (
                              <TableRow key={project.id} className="border-[#e5e5ea]">
                                <TableCell className="px-4 py-3">
                                  <div className="flex items-center gap-2 text-[14px] font-medium text-[#1d1d1f]">
                                    <FolderKanban className="size-4 text-[#6e6e73]" />
                                    {project.name}
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                  <Badge className="rounded-full bg-[#f5f5f7] px-3 py-1 text-[11px] font-medium text-[#1d1d1f]">
                                    {project.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
