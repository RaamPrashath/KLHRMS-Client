'use client';

import { useState, useCallback, useTransition } from 'react';
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

import { ProjectsTable } from './ProjectsTable';
import { ProjectViewDrawer } from '@/modules/projects/components/ProjectViewDrawer';
import { useProjectMutations } from '@/modules/projects/hooks/useProjectMutations';
import {
  useProjectDetailQuery,
  useProjectMetaQuery,
  useProjectsQuery,
} from '@/modules/projects/hooks/useProjectsQuery';
import type { ProjectInput } from '@/modules/projects/schema/projectSchemas';
import type {
  ProjectDetail,
  ProjectStatus,
  ProjectSummary,
} from '@/modules/projects/types/projectTypes';

interface ProjectPageShellProps {
  orgSlug: string;
  memberId: string;
  canManageProjects: boolean;
}

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

function readError(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse((error as Error)?.message ?? '{}');
    return parsed.message || fallback;
  } catch {
    return fallback;
  }
}

export function ProjectPageShell({
  orgSlug,
  memberId,
  canManageProjects,
}: Readonly<ProjectPageShellProps>) {
  const [, startTransition] = useTransition();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectSnapshot, setSelectedProjectSnapshot] =
    useState<ProjectDetail | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectInput>(defaultProjectForm);

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data, isLoading, isError, error } = useProjectsQuery(orgSlug, memberId, {
    search: search || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    page,
    pageSize,
  });

  const metaQuery = useProjectMetaQuery(orgSlug, memberId);
  const detailQuery = useProjectDetailQuery(orgSlug, memberId, selectedProjectId);
  const mutations = useProjectMutations(orgSlug, memberId);

  const selectedProject = detailQuery.data ?? selectedProjectSnapshot ?? undefined;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      setSearch(value);
      setPage(1);
    });
  }, []);

  const handleStatusChange = useCallback((value: ProjectStatus | 'ALL') => {
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

  const handleRowClick = useCallback((project: ProjectSummary) => {
    setSelectedProjectId(project.id);
    setSelectedProjectSnapshot(null);
    setDrawerOpen(true);
  }, []);

  function openCreateDialog() {
    setEditingProjectId(null);
    setProjectForm(defaultProjectForm);
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
        toast.success('Project updated');
        return;
      }

      const created = await mutations.createProject.mutateAsync(projectForm);
      setSelectedProjectId(created.id);
      setSelectedProjectSnapshot(created);
      setFormOpen(false);
      setProjectForm(defaultProjectForm);
      toast.success('Project created');
    } catch (error) {
      toast.error(readError(error, 'Failed to save project'));
    }
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (isError) {
    let message = 'Failed to load projects.';
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

  const totalPages = data?.page ? Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)) : 1;
  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-full">
      <div className="flex items-center justify-between ml-7 mt-7 mr-7">
        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">Projects</h1>
        {canManageProjects && (
          <Button
            onClick={openCreateDialog}
            className="h-11 rounded-xl px-5 text-[15px] font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#00874a' }}
          >
            <Plus className="mr-2 size-4" />
            Create project
          </Button>
        )}
      </div>

      <ProjectsTable
        data={items}
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

      {/* ── Create / Edit dialog ───────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-[92vw]! sm:w-[78vw]! lg:w-[44vw]! xl:w-[40vw]! max-w-none! max-h-[82vh] overflow-hidden rounded-[18px] border border-[#e5e5ea] bg-white p-0 shadow-2xl">
          <div className="flex max-h-[82vh] flex-col">
            <DialogHeader className="shrink-0 border-b border-[#e5e5ea] px-6 py-4">
              <DialogTitle className="text-[22px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                {editingProjectId ? 'Edit project' : 'Create project'}
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-5 text-[#6e6e73]">
                Add the key project details, then open it for staffing and delivery tracking.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-name">Project name</Label>
                  <Input
                    id="project-name"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    className="h-10 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="project-client">Client</Label>
                    <Input
                      id="project-client"
                      value={projectForm.clientName || ''}
                      onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                      className="h-10 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Team</Label>
                    <Select
                      value={projectForm.teamId || 'none'}
                      onValueChange={(value) =>
                        setProjectForm({ ...projectForm, teamId: value === 'none' ? '' : value })
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
                    <Label>Status</Label>
                    <Select
                      value={projectForm.status}
                      onValueChange={(value) =>
                        setProjectForm({ ...projectForm, status: value as ProjectStatus })
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
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="min-h-20 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-lg border border-[#e5e5ea] px-4 py-2.5 text-[14px] text-[#1d1d1f]">
                  <input
                    type="checkbox"
                    checked={projectForm.billable}
                    onChange={(e) => setProjectForm({ ...projectForm, billable: e.target.checked })}
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
                onClick={() => void handleSaveProject()}
                disabled={mutations.createProject.isPending || mutations.updateProject.isPending}
                style={{ backgroundColor: '#00874a' }}
                className="h-10 rounded-full px-6 text-white"
              >
                {mutations.createProject.isPending || mutations.updateProject.isPending
                  ? 'Saving…'
                  : editingProjectId
                    ? 'Save changes'
                    : 'Create Project'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Right-side view drawer ────────────────────────────────────────── */}
      <ProjectViewDrawer
        key={selectedProjectId ?? 'project-drawer'}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        project={selectedProject}
        isLoading={detailQuery.isLoading}
        canManage={canManageProjects}
        orgSlug={orgSlug}
        memberId={memberId}
        allOrgMembers={metaQuery.data?.members ?? []}
      />
    </div>
  );
}
