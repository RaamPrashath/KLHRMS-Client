'use client';

import { useState, useCallback, useTransition } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DepartmentsTable } from './DepartmentsTable';
import { DepartmentDetailDialog } from './DepartmentDetailDialog';
import { DepartmentTeamsDialog } from './DepartmentTeamsDialog';
import { useDepartmentsQuery, useDepartmentMetaQuery } from '@/modules/departments/hooks/useDepartmentsQuery';
import { useDepartmentMutations } from '@/modules/departments/hooks/useDepartmentMutations';
import type { DepartmentInput, TeamInput, TeamMemberInput } from '@/modules/departments/schema/departmentSchemas';
import type { DepartmentSummary, DepartmentStatus, TeamSummary } from '@/modules/departments/types/departmentTypes';

interface DepartmentsPageShellProps {
  orgSlug: string;
  memberId: string;
  canManageDepartments: boolean;
}

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
}: Readonly<DepartmentsPageShellProps>) {
  const [, startTransition] = useTransition();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DepartmentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentSummary | null>(null);
  const [departmentForm, setDepartmentForm] = useState<DepartmentInput>(defaultDepartmentForm);
  const [teamForm, setTeamForm] = useState<TeamInput>(defaultTeamForm);
  const [memberForms, setMemberForms] = useState<Record<string, TeamMemberInput>>({});

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data, isLoading, isError, error } = useDepartmentsQuery(orgSlug, memberId, {
    search: search || undefined,
    page,
    pageSize,
  });

  const metaQuery = useDepartmentMetaQuery(orgSlug, memberId, canManageDepartments);
  const mutations = useDepartmentMutations(orgSlug, memberId);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      setSearch(value);
      setPage(1);
    });
  }, []);

  const handleStatusChange = useCallback((value: DepartmentStatus | 'ALL') => {
    startTransition(() => {
      setStatusFilter(value);
      setPage(1);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    startTransition(() => {
      setSearch('');
      setStatusFilter('ALL');
      setPage(1);
    });
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    startTransition(() => setPage(newPage));
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    startTransition(() => {
      setPageSize(newSize);
      setPage(1);
    });
  }, []);

  const handleRowClick = useCallback((department: DepartmentSummary) => {
    setSelectedDepartment(department);
    setDetailOpen(true);
  }, []);

  function openDepartmentCreateDialog() {
    setDepartmentForm(defaultDepartmentForm);
    setDepartmentDialogOpen(true);
  }

  function openTeamCreateDialog(departmentId: string) {
    setTeamForm(defaultTeamForm);
    setTeamDialogOpen(true);
  }

  async function handleSaveDepartment() {
    try {
      const created = await mutations.createDepartment.mutateAsync(departmentForm);
      setSelectedDepartment(created);
      setDepartmentDialogOpen(false);
      setDetailOpen(true);
      setDepartmentForm(defaultDepartmentForm);
      toast.success('Department created');
    } catch (error) {
      toast.error(readError(error, 'Failed to create department'));
    }
  }

  async function handleSaveTeam() {
    const departmentId = selectedDepartment?.id;
    if (!departmentId) return;
    try {
      const updatedDepartment = await mutations.createTeam.mutateAsync({
        departmentId,
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

  // ── Apply client-side status filter ─────────────────────────────────────────
  const items = data?.items ?? [];
  const filteredItems = statusFilter === 'ALL'
    ? items
    : items.filter((d) => d.status === statusFilter);

  // ── Error state ─────────────────────────────────────────────────────────────
  if (isError) {
    let message = 'Failed to load departments.';
    try {
      const parsed = JSON.parse(error?.message ?? '{}');
      if (parsed.message) message = parsed.message;
    } catch {
      // ignore parse errors
    }
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-100 bg-surface p-8">
        <p className="text-sm text-destructive-text">{message}</p>
      </div>
    );
  }

  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-full">
      <div className="flex items-center justify-between ml-7 mt-7 mr-7">
        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">Departments</h1>
        {canManageDepartments && (
          <Button
            onClick={openDepartmentCreateDialog}
            className="h-11 rounded-xl px-5 text-[15px] font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#00874a' }}
          >
            <Plus className="mr-2 size-4" />
            Create department
          </Button>
        )}
      </div>

      <DepartmentsTable
        data={filteredItems}
        isLoading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        search={search}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onClearAll={handleClearAll}
        onRowClick={handleRowClick}
      />

      {/* ── Create department dialog ─────────────────────────────────────────── */}
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
                className="h-11 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-[3px] focus-visible:ring-primary/10"
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
            <Button variant="ghost" onClick={() => setDepartmentDialogOpen(false)} className="rounded-lg px-5">
              Cancel
            </Button>
            <Button
              onClick={handleSaveDepartment}
              disabled={mutations.createDepartment.isPending}
              className="rounded-lg px-6"
            >
              {mutations.createDepartment.isPending ? 'Creating...' : 'Create and open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create team dialog ───────────────────────────────────────────────── */}
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
                className="h-11 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-[3px] focus-visible:ring-primary/10"
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
                className="min-h-28 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-[3px] focus-visible:ring-primary/10"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-[#e5e5ea] px-6 py-4">
            <Button variant="ghost" onClick={() => setTeamDialogOpen(false)} className="rounded-lg px-5">
              Cancel
            </Button>
            <Button
              onClick={handleSaveTeam}
              disabled={mutations.createTeam.isPending}
              className="rounded-lg px-6"
            >
              {mutations.createTeam.isPending ? 'Creating...' : 'Create and open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────────────────── */}
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
            <AlertDialogCancel className="rounded-lg px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDepartment}
              className="rounded-lg px-6"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Detail dialog ────────────────────────────────────────────────────── */}
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

      {/* ── Teams dialog ─────────────────────────────────────────────────────── */}
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
    </div>
  );
}
