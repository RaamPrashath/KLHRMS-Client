'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import {
  ChevronRight,
  FolderKanban,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import { cn } from '@/lib/utils';
import { useProjectMutations } from '@/modules/projects/hooks/useProjectMutations';
import {
  useProjectDetailQuery,
  useProjectMetaQuery,
  useProjectsQuery,
} from '@/modules/projects/hooks/useProjectsQuery';
import type {
  ProjectInput,
  ProjectMemberInput,
} from '@/modules/projects/schema/projectSchemas';
import type {
  ProjectDetail,
  ProjectMetaResponse,
  ProjectStatus,
} from '@/modules/projects/types/projectTypes';

const ACTION_BLUE = '#00874a';

const defaultProjectForm: ProjectInput = {
  name: '',
  description: '',
  clientName: '',
  teamId: '',
  status: 'ACTIVE',
  startDate: '',
  endDate: '',
  budget: null,
  budgetedHours: null,
  billable: true,
};

const defaultMemberForm: ProjectMemberInput = {
  memberId: '',
  role: '',
  allocatedHours: null,
};

function readError(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse((error as Error)?.message ?? '{}');
    return parsed.message || fallback;
  } catch {
    return fallback;
  }
}

function statusBadge(status: ProjectStatus) {
  const map: Record<ProjectStatus, string> = {
    ACTIVE: 'bg-[#eef9f1] text-[#156f3d]',
    ON_HOLD: 'bg-[#fff7e8] text-[#8a5a00]',
    COMPLETED: 'bg-[#eef5ff] text-[#2454a6]',
    CANCELLED: 'bg-[#fff0f0] text-[#a12323]',
  };

  return map[status];
}

function formatMoney(value: number | null) {
  if (value === null) return 'Not set';
  return `$${value.toLocaleString()}`;
}

function formatDate(value: string | null) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString();
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
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
        {label}
      </p>
      <p className="mt-1 text-[15px] leading-6 text-[#1d1d1f]">{value}</p>
    </div>
  );
}

export function ProjectPageShell({
  orgSlug,
  memberId,
  canManageProjects,
}: {
  orgSlug: string;
  memberId: string;
  canManageProjects: boolean;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [detailOpen, setDetailOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectSnapshot, setSelectedProjectSnapshot] =
    useState<ProjectDetail | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] =
    useState<ProjectInput>(defaultProjectForm);
  const [memberForm, setMemberForm] =
    useState<ProjectMemberInput>(defaultMemberForm);

  const deferredSearch = useDeferredValue(search);
  const shouldReduceMotion = useReducedMotion();

  const filters = useMemo(
    () => ({
      search: deferredSearch || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page: 1,
      pageSize: 50,
    }),
    [deferredSearch, statusFilter],
  );

  const projectsQuery = useProjectsQuery(orgSlug, memberId, filters);
  const metaQuery = useProjectMetaQuery(orgSlug, memberId);
  const detailQuery = useProjectDetailQuery(
    orgSlug,
    memberId,
    selectedProjectId,
  );
  const mutations = useProjectMutations(orgSlug, memberId);

  const projects = projectsQuery.data?.items ?? [];
  const selectedProject =
    detailQuery.data ?? selectedProjectSnapshot ?? undefined;

  const stats = useMemo(
    () => ({
      total: projects.length,
      active: projects.filter((project) => project.status === 'ACTIVE').length,
      hold: projects.filter((project) => project.status === 'ON_HOLD').length,
      completed: projects.filter((project) => project.status === 'COMPLETED')
        .length,
    }),
    [projects],
  );

  function openCreateDialog() {
    setEditingProjectId(null);
    setProjectForm(defaultProjectForm);
    setFormOpen(true);
  }

  function openProjectDetails(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedProjectSnapshot(null);
    setDetailOpen(true);
  }

  function openEditDialog() {
    if (!selectedProject) return;

    setEditingProjectId(selectedProject.id);
    setProjectForm({
      name: selectedProject.name,
      description: selectedProject.description ?? '',
      clientName: selectedProject.clientName ?? '',
      teamId: selectedProject.teamId ?? '',
      status: selectedProject.status,
      startDate: selectedProject.startDate ?? '',
      endDate: selectedProject.endDate ?? '',
      budget: selectedProject.budget,
      budgetedHours: selectedProject.budgetedHours,
      billable: selectedProject.billable,
    });

    setDetailOpen(false);
    setFormOpen(true);
  }

  async function handleSaveProject() {
    try {
      if (editingProjectId) {
        const updated = await mutations.updateProject.mutateAsync({
          projectId: editingProjectId,
          data: projectForm,
        });

        setSelectedProjectId(updated.id);
        setSelectedProjectSnapshot(updated);
        setFormOpen(false);
        setDetailOpen(true);
        toast.success('Project updated');
        return;
      }

      const created = await mutations.createProject.mutateAsync(projectForm);

      setSelectedProjectId(created.id);
      setSelectedProjectSnapshot(created);
      setFormOpen(false);
      setDetailOpen(true);
      setProjectForm(defaultProjectForm);
      toast.success('Project created');
    } catch (error) {
      toast.error(readError(error, 'Failed to save project'));
    }
  }

  async function handleDeleteProject(projectId: string) {
    try {
      await mutations.deleteProject.mutateAsync(projectId);

      setDetailOpen(false);
      setMembersOpen(false);
      setSelectedProjectId(null);
      setSelectedProjectSnapshot(null);
      toast.success('Project deleted');
    } catch (error) {
      toast.error(readError(error, 'Failed to delete project'));
    }
  }

  async function handleAddMember() {
    if (!selectedProjectId || !memberForm.memberId) return;

    try {
      const updated = await mutations.addMember.mutateAsync({
        projectId: selectedProjectId,
        data: memberForm,
      });

      setSelectedProjectSnapshot(updated);
      setMemberForm(defaultMemberForm);
      toast.success('Employee assigned');
    } catch (error) {
      toast.error(readError(error, 'Failed to assign employee'));
    }
  }

  async function handleRemoveMember(targetMemberId: string) {
    if (!selectedProjectId) return;

    try {
      const updated = await mutations.removeMember.mutateAsync({
        projectId: selectedProjectId,
        targetMemberId,
      });

      setSelectedProjectSnapshot(updated);
      toast.success('Employee removed');
    } catch (error) {
      toast.error(readError(error, 'Failed to remove employee'));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
            Delivery
          </p>
          <h1 className="mt-2 text-[40px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            Projects
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-7 text-[#6e6e73]">
            Show ownership, client context, timeline, and staffing in one place
            so HR, admin, and employees can all follow the work.
          </p>
        </div>

        {canManageProjects && (
          <Button
            onClick={openCreateDialog}
            className="h-11 rounded-full px-5 text-[15px] font-medium text-white"
            style={{ backgroundColor: ACTION_BLUE }}
          >
            <Plus className="mr-2 size-4" />
            Create project
          </Button>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'ALL', label: 'All', count: stats.total },
            { value: 'ACTIVE', label: 'Active', count: stats.active },
            { value: 'ON_HOLD', label: 'On hold', count: stats.hold },
            { value: 'COMPLETED', label: 'Completed', count: stats.completed },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() =>
                setStatusFilter(option.value as ProjectStatus | 'ALL')
              }
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
        </div>

        <div className="w-full lg:max-w-sm">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search project or client"
            className="h-11 rounded-full border-[#e5e5ea] bg-white px-4 text-[15px] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
          />
        </div>
      </div>

      <div className="overflow-hidden border border-[#e5e5ea] bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-[#e5e5ea] bg-[#f5f5f7] hover:bg-[#f5f5f7]">
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                Project
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                Client
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                Team
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                People
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                Allocated hours
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
            {projectsQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <RowSkeleton key={index} colSpan={7} />
              ))
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-16 text-center">
                  <FolderKanban className="mx-auto size-8 text-[#86868b]" />
                  <p className="mt-3 text-[15px] font-medium text-[#1d1d1f]">
                    No projects match this view
                  </p>
                  <p className="mt-1 text-[14px] text-[#6e6e73]">
                    Try another filter or create a new project.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <motion.tr
                  key={project.id}
                  initial={
                    shouldReduceMotion ? undefined : { opacity: 0, y: 6 }
                  }
                  animate={
                    shouldReduceMotion ? undefined : { opacity: 1, y: 0 }
                  }
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => openProjectDetails(project.id)}
                  className="cursor-pointer border-[#e5e5ea] transition-colors hover:bg-[#f5f5f7]"
                >
                  <TableCell className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center border border-[#e5e5ea] bg-white text-[#1d1d1f]">
                        <FolderKanban className="size-4" />
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">
                          {project.name}
                        </p>
                        <p className="text-[13px] text-[#6e6e73]">
                          {project.billable
                            ? 'Billable project'
                            : 'Internal project'}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-4 text-[14px] text-[#1d1d1f]">
                    {project.clientName || 'Internal'}
                  </TableCell>

                  <TableCell className="px-4 py-4 text-[14px] text-[#1d1d1f]">
                    {project.teamName || 'Not linked'}
                  </TableCell>

                  <TableCell className="px-4 py-4 text-[14px] text-[#1d1d1f]">
                    {project.memberCount}
                  </TableCell>

                  <TableCell className="px-4 py-4 text-[14px] text-[#1d1d1f]">
                    {project.allocatedHours}h
                  </TableCell>

                  <TableCell className="px-4 py-4">
                    <Badge
                      className={cn(
                        'rounded-full px-3 py-1 text-[11px] font-medium',
                        statusBadge(project.status),
                      )}
                    >
                      {project.status.replaceAll('_', ' ')}
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="!w-[92vw] sm:!w-[78vw] lg:!w-[44vw] xl:!w-[40vw] !max-w-none max-h-[82vh] overflow-hidden rounded-[18px] border border-[#e5e5ea] bg-white p-0 shadow-2xl">
          <div className="flex max-h-[82vh] flex-col">
            <DialogHeader className="shrink-0 border-b border-[#e5e5ea] px-6 py-4">
              <DialogTitle className="text-[22px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                {editingProjectId ? 'Edit project' : 'Create project'}
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-5 text-[#6e6e73]">
                Add the key project details, then open it for staffing and
                delivery tracking.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-name">Project name</Label>
                  <Input
                    id="project-name"
                    value={projectForm.name}
                    onChange={(event) =>
                      setProjectForm({
                        ...projectForm,
                        name: event.target.value,
                      })
                    }
                    className="h-10 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="project-client">Client</Label>
                    <Input
                      id="project-client"
                      value={projectForm.clientName || ''}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          clientName: event.target.value,
                        })
                      }
                      className="h-10 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Team</Label>
                    <Select
                      value={projectForm.teamId || 'none'}
                      onValueChange={(value) =>
                        setProjectForm({
                          ...projectForm,
                          teamId: value === 'none' ? '' : value,
                        })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-lg border-[#e5e5ea] shadow-none">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not linked</SelectItem>
                        {metaQuery.data?.teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="project-start">Start date</Label>
                    <Input
                      id="project-start"
                      type="date"
                      value={projectForm.startDate || ''}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          startDate: event.target.value,
                        })
                      }
                      className="h-10 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="project-end">End date</Label>
                    <Input
                      id="project-end"
                      type="date"
                      value={projectForm.endDate || ''}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          endDate: event.target.value,
                        })
                      }
                      className="h-10 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="project-budget">Budget</Label>
                    <Input
                      id="project-budget"
                      type="number"
                      min={0}
                      value={projectForm.budget ?? ''}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          budget:
                            event.target.value === ''
                              ? null
                              : Number(event.target.value),
                        })
                      }
                      className="h-10 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="project-budgeted-hours">
                      Budgeted hours
                    </Label>
                    <Input
                      id="project-budgeted-hours"
                      type="number"
                      min={0}
                      value={projectForm.budgetedHours ?? ''}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          budgetedHours:
                            event.target.value === ''
                              ? null
                              : Number(event.target.value),
                        })
                      }
                      className="h-10 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                      value={projectForm.status}
                      onValueChange={(value) =>
                        setProjectForm({
                          ...projectForm,
                          status: value as ProjectStatus,
                        })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-lg border-[#e5e5ea] shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ON_HOLD">On hold</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    value={projectForm.description || ''}
                    onChange={(event) =>
                      setProjectForm({
                        ...projectForm,
                        description: event.target.value,
                      })
                    }
                    className="min-h-20 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-lg border border-[#e5e5ea] px-4 py-2.5 text-[14px] text-[#1d1d1f]">
                  <input
                    type="checkbox"
                    checked={projectForm.billable}
                    onChange={(event) =>
                      setProjectForm({
                        ...projectForm,
                        billable: event.target.checked,
                      })
                    }
                    className="size-4 accent-[#0066cc]"
                  />
                  Billable project
                </label>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-[#e5e5ea] px-6 py-3">
              <Button
                variant="ghost"
                onClick={() => setFormOpen(false)}
                className="h-10 rounded-full px-5"
              >
                Cancel
              </Button>

              <Button
                onClick={handleSaveProject}
                disabled={
                  mutations.createProject.isPending ||
                  mutations.updateProject.isPending
                }
                style={{ backgroundColor: ACTION_BLUE }}
                className="h-10 rounded-full px-6 text-white"
              >
                {mutations.createProject.isPending ||
                mutations.updateProject.isPending
                  ? 'Saving...'
                  : editingProjectId
                    ? 'Save changes'
                    : 'Create and open'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ProjectDetailDialog
        canManage={canManageProjects}
        isLoading={detailQuery.isLoading}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDelete={handleDeleteProject}
        onEdit={openEditDialog}
        onViewMembers={() => {
          setDetailOpen(false);
          setMembersOpen(true);
        }}
        project={selectedProject}
      />

      <ProjectMembersDialog
        isLoading={detailQuery.isLoading}
        isMutating={
          mutations.addMember.isPending || mutations.removeMember.isPending
        }
        isOpen={membersOpen}
        canManage={canManageProjects}
        memberForm={memberForm}
        meta={metaQuery.data}
        onAddMember={handleAddMember}
        onClose={() => setMembersOpen(false)}
        onRemoveMember={handleRemoveMember}
        project={selectedProject}
        setMemberForm={setMemberForm}
      />
    </div>
  );
}

function ProjectDetailDialog({
  canManage,
  isLoading,
  isOpen,
  onClose,
  onDelete,
  onEdit,
  onViewMembers,
  project,
}: {
  canManage: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (projectId: string) => Promise<void>;
  onEdit: () => void;
  onViewMembers: () => void;
  project?: ProjectDetail;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!w-[92vw] lg:!w-[35vw] !max-w-none overflow-hidden rounded-[18px] border border-[#e5e5ea] bg-white p-0 shadow-2xl">
        {isLoading && !project ? (
          <div className="space-y-3 px-8 py-8">
            <Skeleton className="h-8 w-52 rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : !project ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Project details unavailable</DialogTitle>
              <DialogDescription>
                The selected project details could not be loaded.
              </DialogDescription>
            </DialogHeader>
            <div className="px-8 py-10">
              <p className="text-[15px] text-[#6e6e73]">
                Unable to load project details.
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="border-b border-[#e5e5ea] px-8 py-6 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">
                    Project
                  </p>
                  <DialogTitle className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f]">
                    {project.name}
                  </DialogTitle>
                </div>
                <Badge
                  className={cn(
                    'mt-1 shrink-0 rounded-full px-3 py-1 text-[11px] font-medium',
                    statusBadge(project.status),
                  )}
                >
                  {project.status.replaceAll('_', ' ')}
                </Badge>
              </div>
              <DialogDescription className="mt-2 text-[15px] leading-relaxed text-[#6e6e73]">
                {project.clientName || 'Internal project'},{' '}
                {project.teamName || 'no linked team'}.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[55vh] overflow-y-auto">
              <div className="px-8 py-6">
                <div className="grid grid-cols-2 gap-x-12 gap-y-0">
                  <OverviewField
                    label="Client"
                    value={project.clientName || 'Internal'}
                  />
                  <OverviewField
                    label="Team"
                    value={project.teamName || 'Not linked'}
                  />
                  <OverviewField
                    label="Budget"
                    value={formatMoney(project.budget)}
                  />
                  <OverviewField
                    label="Budgeted hours"
                    value={
                      project.budgetedHours
                        ? `${project.budgetedHours}h`
                        : 'Not set'
                    }
                  />
                  <OverviewField
                    label="Start date"
                    value={formatDate(project.startDate)}
                  />
                  <OverviewField
                    label="End date"
                    value={formatDate(project.endDate)}
                  />
                  <OverviewField
                    label="Assigned people"
                    value={`${project.memberCount}`}
                  />
                  <OverviewField
                    label="Allocated hours"
                    value={`${project.allocatedHours}h`}
                  />
                </div>
              </div>

              <div className="border-t border-[#e5e5ea] px-8 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                  Description
                </p>
                <p className="mt-2 text-[14px] leading-6 text-[#1d1d1f]">
                  {project.description || 'No project description captured yet.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#e5e5ea] px-8 py-4">
              <Button
                variant="outline"
                className="rounded-full border-[#e5e5ea] px-5 text-[14px] font-medium text-[#1d1d1f]"
                onClick={onViewMembers}
              >
                View members
                <ChevronRight className="ml-1 size-4" />
              </Button>

              {canManage && (
                <>
                  <Button
                    className="rounded-full px-5 text-[14px] font-medium text-white"
                    style={{ backgroundColor: ACTION_BLUE }}
                    onClick={onEdit}
                  >
                    Edit project
                  </Button>

                  <div className="ml-auto">
                    <Button
                      variant="ghost"
                      className="rounded-full px-5 text-[14px] font-medium text-[#86868b] hover:text-[#1d1d1f]"
                      onClick={() => void onDelete(project.id)}
                    >
                      Delete project
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

function ProjectMembersDialog({
  isLoading,
  isMutating,
  isOpen,
  canManage,
  memberForm,
  meta,
  onAddMember,
  onClose,
  onRemoveMember,
  project,
  setMemberForm,
}: {
  isLoading: boolean;
  isMutating: boolean;
  isOpen: boolean;
  canManage: boolean;
  memberForm: ProjectMemberInput;
  meta?: ProjectMetaResponse;
  onAddMember: () => Promise<void>;
  onClose: () => void;
  onRemoveMember: (memberId: string) => Promise<void>;
  project?: ProjectDetail;
  setMemberForm: (value: ProjectMemberInput) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!w-[92vw] lg:!w-[58vw] !max-w-none max-h-[82vh] overflow-hidden rounded-[18px] border border-[#e5e5ea] bg-white p-0 shadow-2xl">
        <div className="flex max-h-[82vh] flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5e5ea] px-8 py-5 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">
              Project members
            </p>
            <DialogTitle className="mt-1.5 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f]">
              {project?.name || 'Project'}
            </DialogTitle>
            <DialogDescription className="mt-2 text-[14px] leading-relaxed text-[#6e6e73]">
              Review assigned employees and their weekly allocation.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 px-8 py-5">
              {canManage && (
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                    Assign member
                  </p>

                  <div className="flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                      <Select
                        value={memberForm.memberId || 'none'}
                        onValueChange={(value) =>
                          setMemberForm({
                            ...memberForm,
                            memberId: value === 'none' ? '' : value,
                          })
                        }
                      >
                        <SelectTrigger className="h-11 rounded-lg border-[#e5e5ea] shadow-none">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select employee</SelectItem>
                          {meta?.members.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-36">
                      <Input
                        id="project-member-role"
                        value={memberForm.role || ''}
                        onChange={(event) =>
                          setMemberForm({
                            ...memberForm,
                            role: event.target.value,
                          })
                        }
                        placeholder="Role"
                        className="h-11 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                      />
                    </div>

                    <div className="w-24">
                      <Input
                        id="project-member-hours"
                        type="number"
                        min={0}
                        value={memberForm.allocatedHours ?? ''}
                        onChange={(event) =>
                          setMemberForm({
                            ...memberForm,
                            allocatedHours:
                              event.target.value === ''
                                ? null
                                : Number(event.target.value),
                          })
                        }
                        placeholder="Hours"
                        className="h-11 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                      />
                    </div>

                    <Button
                      onClick={() => void onAddMember()}
                      disabled={isMutating}
                      className="h-11 shrink-0 rounded-full px-5 text-[14px] font-medium text-white"
                      style={{ backgroundColor: ACTION_BLUE }}
                    >
                      <UserPlus className="mr-2 size-4" />
                      Add
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                  Members ({project?.members.length ?? 0})
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
                        <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                          Weekly hours
                        </TableHead>
                        {canManage && (
                          <TableHead className="h-10 w-[60px] px-4 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]" />
                        )}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoading && !project ? (
                        Array.from({ length: 4 }).map((_, index) => (
                          <RowSkeleton
                            key={index}
                            colSpan={canManage ? 4 : 3}
                          />
                        ))
                      ) : !project || project.members.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={canManage ? 4 : 3}
                            className="px-4 py-10 text-center"
                          >
                            <Users className="mx-auto size-5 text-[#86868b]" />
                            <p className="mt-2 text-[14px] text-[#6e6e73]">
                              No employees assigned yet.
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        project.members.map((member) => (
                          <TableRow
                            key={member.id}
                            className="border-[#e5e5ea]"
                          >
                            <TableCell className="px-4 py-3 text-[14px] font-medium text-[#1d1d1f]">
                              {member.name || member.email || member.memberId}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-[14px] text-[#6e6e73]">
                              {member.role || 'Contributor'}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-[14px] text-[#1d1d1f]">
                              {member.allocatedHours ?? 0}h
                            </TableCell>
                            {canManage && (
                              <TableCell className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-[#86868b] hover:text-[#1d1d1f]"
                                  onClick={() =>
                                    void onRemoveMember(member.memberId)
                                  }
                                >
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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}