'use client';

import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Edit2, ListTodo, Plus, Search, Trash2, UserCheck, UserMinus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { cn } from '@/lib/utils';
import { useProjectMutations } from '@/modules/projects/hooks/useProjectMutations';
import {
  projectSchema,
  projectStatusOptions,
  type ProjectFormInput,
  type ProjectInput,
} from '@/modules/projects/schema/projectSchemas';
import type {
  ProjectDetail,
  ProjectLookupOption,
  ProjectMemberSummary,
  ProjectTaskSummary,
  ProjectStatus,
} from '@/modules/projects/types/projectTypes';

function TabBar({
  tabs,
  value,
  onValueChange,
}: {
  tabs: { value: string; label: string; count?: number }[];
  value: string;
  onValueChange: (v: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const activeIdx = tabs.findIndex((t) => t.value === value);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(`[data-tab-index="${activeIdx}"]`);
    if (!activeBtn) return;
    const cr = container.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();
    setIndicatorStyle({ left: br.left - cr.left, width: br.width });
  }, [activeIdx]);

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-2 w-full rounded-xl bg-neutral-50 p-1 border border-black/4 relative"
    >
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
      {tabs.map((tab, idx) => (
        <button
          key={tab.value}
          data-tab-index={idx}
          type="button"
          onClick={() => onValueChange(tab.value)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 h-8 px-4 text-[13px] font-medium rounded-lg relative z-10 transition-colors duration-200',
            value === tab.value ? 'text-[#00874A]' : 'text-neutral-500 hover:text-neutral-900',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-xs',
              value === tab.value ? 'text-[#00874A]/70' : 'text-neutral-400',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

const ACTION_GREEN = '#00874a';

function statusBadge(status: ProjectStatus) {
  const map: Record<ProjectStatus, string> = {
    ACTIVE: 'bg-[#eef9f1] text-[#156f3d]',
    ON_HOLD: 'bg-[#fff7e8] text-[#8a5a00]',
    COMPLETED: 'bg-[#eef5ff] text-[#2454a6]',
    CANCELLED: 'bg-[#fff0f0] text-[#a12323]',
  };
  return map[status];
}

function readError(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse((error as Error)?.message ?? '{}');
    return parsed.message || fallback;
  } catch {
    return fallback;
  }
}

interface ProjectViewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectDetail | undefined;
  isLoading: boolean;
  canManage: boolean;
  orgSlug: string;
  memberId: string;
  allOrgMembers: ProjectLookupOption[];
}

export function ProjectViewDrawer({
  isOpen,
  onClose,
  project,
  isLoading,
  canManage,
  orgSlug,
  memberId,
  allOrgMembers,
}: ProjectViewDrawerProps) {
  const queryClient = useQueryClient();
  const mutations = useProjectMutations(orgSlug, memberId);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'members'>('tasks');
  const [memberTab, setMemberTab] = useState<'assigned' | 'unassigned'>('assigned');

  // Task state
  const [newTaskName, setNewTaskName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');

  // Member state
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [assignedSearch, setAssignedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const deferredUnassignedSearch = useDeferredValue(unassignedSearch);
  const deferredAssignedSearch = useDeferredValue(assignedSearch);

  const form = useForm<ProjectFormInput, unknown, ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'ACTIVE',
      billable: false,
      clientName: '',
      teamId: '',
      budget: null,
      budgetedHours: null,
      startDate: '',
      endDate: '',
    },
  });
  const watchedStatus = useWatch({
    control: form.control,
    name: 'status',
  });

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description ?? '',
        status: project.status,
        billable: project.billable,
        clientName: project.clientName ?? '',
        teamId: project.teamId ?? '',
        budget: project.budget,
        budgetedHours: project.budgetedHours,
        startDate: project.startDate ?? '',
        endDate: project.endDate ?? '',
      });
    }
  }, [project, form]);

  const assignedMemberIds = useMemo(
    () => new Set((project?.members ?? []).map((m) => m.memberId)),
    [project?.members],
  );

  const unassignedMembers = useMemo(() => {
    const term = deferredUnassignedSearch.toLowerCase().trim();
    return allOrgMembers.filter((m) => {
      if (assignedMemberIds.has(m.id)) return false;
      if (!term) return true;
      return (
        m.label.toLowerCase().includes(term) ||
        (m.email ?? '').toLowerCase().includes(term)
      );
    });
  }, [allOrgMembers, assignedMemberIds, deferredUnassignedSearch]);

  const assignedMembers = useMemo(() => {
    const term = deferredAssignedSearch.toLowerCase().trim();
    return (project?.members ?? []).filter((m) => {
      if (!term) return true;
      const name = (m.name ?? '').toLowerCase();
      const email = (m.email ?? '').toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [project?.members, deferredAssignedSearch]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleCreateTask() {
    if (!project || !newTaskName.trim()) return;
    
    const taskName = newTaskName.trim();
    setNewTaskName(''); // Clear input immediately (optimistic)
    
    try {
      await mutations.createTask.mutateAsync({
        projectId: project.id,
        data: { name: taskName },
      });
      toast.success('Task created');
    } catch (error) {
      setNewTaskName(taskName); // Restore input on error
      toast.error(readError(error, 'Failed to create task'));
    }
  }

  async function handleUpdateTask(taskId: string) {
    if (!project || !editingTaskName.trim()) return;
    
    // Optimistic update
    const queryKey = ['project', orgSlug, project.id];
    
    queryClient.setQueryData<ProjectDetail>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        tasks: old.tasks.map((t: ProjectTaskSummary) =>
          t.id === taskId ? { ...t, name: editingTaskName.trim() } : t
        ),
      };
    });
    
    setEditingTaskId(null);
    toast.success('Task updated');
    
    // TODO: When backend endpoint exists, call it here and handle errors
    // For now, the optimistic update persists until page refresh
  }

  async function handleDeleteTask(taskId: string) {
    if (!project) return;
    if (!confirm('Delete this task?')) return;
    
    // Optimistic update
    const queryKey = ['project', orgSlug, project.id];
    
    queryClient.setQueryData<ProjectDetail>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        taskCount: Math.max(0, old.taskCount - 1),
        tasks: old.tasks.filter((t: ProjectTaskSummary) => t.id !== taskId),
      };
    });
    
    toast.success('Task deleted');
    
    // TODO: When backend endpoint exists, call it here and handle errors
    // For now, the optimistic update persists until page refresh
  }

  async function handleBulkAssign() {
    if (!project || selectedIds.size === 0) return;
    try {
      await mutations.bulkAssignMembers.mutateAsync({
        projectId: project.id,
        memberIds: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} employee${selectedIds.size > 1 ? 's' : ''} assigned`);
    } catch (error) {
      toast.error(readError(error, 'Failed to assign employees'));
    }
  }

  async function handleRemoveMember(targetMemberId: string) {
    if (!project) return;
    try {
      await mutations.removeMember.mutateAsync({
        projectId: project.id,
        targetMemberId,
      });
      toast.success('Employee removed');
    } catch (error) {
      toast.error(readError(error, 'Failed to remove employee'));
    }
  }

  async function handleUpdate(values: ProjectInput) {
    if (!project) return;
    try {
      await mutations.updateProject.mutateAsync({
        projectId: project.id,
        data: values,
      });
      setIsEditing(false);
      toast.success('Project updated');
    } catch (error) {
      toast.error(readError(error, 'Failed to update project'));
    }
  }

  async function handleDelete() {
    if (!project) return;
    if (!confirm(`Delete "${project.name}"? This action cannot be undone.`)) return;
    try {
      await mutations.deleteProject.mutateAsync(project.id);
      onClose();
      toast.success('Project deleted');
    } catch (error) {
      toast.error(readError(error, 'Failed to delete project'));
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={project ? `${project.name} details` : 'Project details'}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[40%] sm:min-w-[360px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {isLoading && !project ? (
          <div className="flex flex-col gap-4 p-8">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : !project ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-[15px] text-[#6e6e73]">Unable to load project details.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="edit-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="shrink-0 overflow-hidden border-b border-[#e5e5ea]"
                >
                  <form
                    onSubmit={form.handleSubmit(handleUpdate)}
                    className="space-y-4 px-6 py-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">
                        Edit Project
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          form.reset();
                        }}
                        className="flex size-8 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                        aria-label="Cancel editing"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="edit-name" className="mb-1 block text-[12px] font-medium text-[#1d1d1f]">
                            Project name
                          </label>
                          <Input
                            id="edit-name"
                            {...form.register('name')}
                            className="h-9 text-[14px]"
                          />
                          {form.formState.errors.name && (
                            <p className="mt-1 text-[11px] text-[#a12323]">{form.formState.errors.name.message}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="edit-client" className="mb-1 block text-[12px] font-medium text-[#1d1d1f]">
                            Client name
                          </label>
                          <Input
                            id="edit-client"
                            {...form.register('clientName')}
                            className="h-9 text-[14px]"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="edit-description" className="mb-1 block text-[12px] font-medium text-[#1d1d1f]">
                          Description
                        </label>
                        <Textarea
                          id="edit-description"
                          {...form.register('description')}
                          rows={3}
                          className="text-[14px] resize-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <div className="w-1/2">
                          <label htmlFor="edit-status" className="mb-1 block text-[12px] font-medium text-[#1d1d1f]">
                            Status
                          </label>
                          <Select
                            value={watchedStatus}
                            onValueChange={(value) => form.setValue('status', value as ProjectStatus)}
                          >
                            <SelectTrigger id="edit-status" className="h-9 w-full text-[14px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {projectStatusOptions.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status.replaceAll('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          form.reset();
                        }}
                        className="flex-1 h-9 rounded-xl text-[13px]"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={mutations.updateProject.isPending}
                        className="flex-1 h-9 rounded-xl text-[13px] text-white"
                        style={{ backgroundColor: ACTION_GREEN }}
                      >
                        {mutations.updateProject.isPending ? 'Saving…' : 'Save changes'}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="view-mode"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="shrink-0 border-b border-[#e5e5ea] px-6 py-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">
                        Project
                      </p>
                      <h2 className="mt-1 truncate text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f]">
                        {project.name}
                      </h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pt-1">
                      <Badge
                        className={cn(
                          'rounded-xl px-3 py-1 text-[11px] font-medium',
                          statusBadge(project.status),
                        )}
                      >
                        {project.status.replaceAll('_', ' ')}
                      </Badge>
                      <button
                        onClick={onClose}
                        className="flex size-8 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                        aria-label="Close drawer"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  {project.description && (
                    <p className="mt-3 text-[14px] leading-relaxed text-[#6e6e73]">
                      {project.description}
                    </p>
                  )}

                  {/* Quick stats */}
                  <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-[#6e6e73]">
                    <span>
                      <span className="font-medium text-[#1d1d1f]">{project.memberCount}</span> assigned
                    </span>
                    <span>
                      <span className="font-medium text-[#1d1d1f]">{project.allocatedHours}h</span> allocated
                    </span>
                    {project.clientName && (
                      <span>
                        Client: <span className="font-medium text-[#1d1d1f]">{project.clientName}</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs with Edit/Delete buttons */}
            <div className="flex min-h-0 flex-1 flex-col">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tasks' | 'members')} className="flex min-h-0 flex-1 flex-col">
                <div className="mx-6 mt-4 mb-0 flex shrink-0 items-center gap-2">
                  <div className="flex-1">
                    <TabBar
                      tabs={[
                        { value: 'tasks', label: 'Tasks', count: project.tasks.length },
                        { value: 'members', label: 'Members', count: project.memberCount },
                      ]}
                      value={activeTab}
                      onValueChange={(v) => setActiveTab(v as 'tasks' | 'members')}
                    />
                  </div>

                  {canManage && !isEditing && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex size-9 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                        aria-label="Edit project"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => void handleDelete()}
                        disabled={mutations.deleteProject.isPending}
                        className="flex size-9 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-[#fff0f0] hover:text-[#a12323] disabled:opacity-50"
                        aria-label="Delete project"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Tasks tab */}
                <TabsContent value="tasks" className="mt-0 flex min-h-0 flex-1 flex-col px-6 pt-4">
                  {canManage && (
                    <div className="mb-3 shrink-0">
                      <div className="flex gap-2">
                        <Input
                          value={newTaskName}
                          onChange={(e) => setNewTaskName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleCreateTask();
                            }
                          }}
                          placeholder="Add a new task…"
                          className="h-10 flex-1 rounded-xl border-[#e5e5ea] text-[14px] shadow-none focus-visible:ring-1 focus-visible:ring-[#00874a]"
                        />
                        <Button
                          onClick={() => void handleCreateTask()}
                          disabled={!newTaskName.trim() || mutations.createTask.isPending}
                          className="h-10 rounded-xl px-4 text-white"
                          style={{ backgroundColor: ACTION_GREEN }}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {project.tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <ListTodo className="size-8 text-[#86868b]" />
                        <p className="mt-3 text-[14px] font-medium text-[#1d1d1f]">
                          No tasks yet
                        </p>
                        <p className="mt-1 text-[13px] text-[#6e6e73]">
                          {canManage ? 'Add your first task above.' : 'Tasks will appear here when added.'}
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-1 pb-4">
                        {project.tasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            canManage={canManage}
                            isEditing={editingTaskId === task.id}
                            editingName={editingTaskName}
                            onEditStart={() => {
                              setEditingTaskId(task.id);
                              setEditingTaskName(task.name);
                            }}
                            onEditChange={setEditingTaskName}
                            onEditSave={() => void handleUpdateTask(task.id)}
                            onEditCancel={() => setEditingTaskId(null)}
                            onDelete={() => void handleDeleteTask(task.id)}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                </TabsContent>

                {/* Members tab */}
                <TabsContent value="members" className="mt-0 flex min-h-0 flex-1 flex-col px-6 pt-4">
                  <Tabs value={memberTab} onValueChange={(v) => setMemberTab(v as 'assigned' | 'unassigned')} className="flex min-h-0 flex-1 flex-col">
                    <div className="mb-3 shrink-0">
                      <TabBar
                        tabs={[
                          { value: 'assigned', label: 'Assigned', count: project.memberCount },
                          {
                            value: 'unassigned',
                            label: 'Unassigned',
                            count: allOrgMembers.filter((m) => !assignedMemberIds.has(m.id)).length,
                          },
                        ]}
                        value={memberTab}
                        onValueChange={(v) => setMemberTab(v as 'assigned' | 'unassigned')}
                      />
                    </div>

                    {/* Assigned sub-tab */}
                    <TabsContent value="assigned" className="mt-0 flex min-h-0 flex-1 flex-col">
                      <div className="relative mb-3 shrink-0">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86868b]" />
                        <Input
                          value={assignedSearch}
                          onChange={(e) => setAssignedSearch(e.target.value)}
                          placeholder="Search assigned…"
                          className="h-10 rounded-xl border-[#e5e5ea] pl-9 text-[14px] shadow-none focus-visible:ring-1 focus-visible:ring-[#00874a]"
                        />
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto">
                        {assignedMembers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="size-8 text-[#86868b]" />
                            <p className="mt-3 text-[14px] font-medium text-[#1d1d1f]">
                              {deferredAssignedSearch ? 'No results' : 'No employees assigned yet'}
                            </p>
                            <p className="mt-1 text-[13px] text-[#6e6e73]">
                              {deferredAssignedSearch
                                ? 'Try a different search term.'
                                : 'Switch to the Unassigned tab to add people.'}
                            </p>
                          </div>
                        ) : (
                          <ul className="space-y-1 pb-4">
                            {assignedMembers.map((member) => (
                              <AssignedMemberRow
                                key={member.id}
                                member={member}
                                canManage={canManage}
                                isRemoving={mutations.removeMember.isPending}
                                onRemove={handleRemoveMember}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    </TabsContent>

                    {/* Unassigned sub-tab */}
                    <TabsContent value="unassigned" className="mt-0 flex min-h-0 flex-1 flex-col">
                      <div className="relative mb-3 shrink-0">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86868b]" />
                        <Input
                          value={unassignedSearch}
                          onChange={(e) => setUnassignedSearch(e.target.value)}
                          placeholder="Search employees…"
                          className="h-10 rounded-xl border-[#e5e5ea] pl-9 text-[14px] shadow-none focus-visible:ring-1 focus-visible:ring-[#00874a]"
                        />
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto">
                        {unassignedMembers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="size-8 text-[#86868b]" />
                            <p className="mt-3 text-[14px] font-medium text-[#1d1d1f]">
                              {deferredUnassignedSearch ? 'No results' : 'All employees assigned'}
                            </p>
                            <p className="mt-1 text-[13px] text-[#6e6e73]">
                              {deferredUnassignedSearch
                                ? 'Try a different search term.'
                                : 'Every org member is already on this project.'}
                            </p>
                          </div>
                        ) : (
                          <ul className="space-y-1 pb-4">
                            {unassignedMembers.map((member) => (
                              <li key={member.id}>
                                <label
                                  className={cn(
                                    'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f5f5f7]',
                                    selectedIds.has(member.id) && 'bg-[#f0f9f4]',
                                  )}
                                >
                                  <Checkbox
                                    checked={selectedIds.has(member.id)}
                                    onCheckedChange={() => toggleSelect(member.id)}
                                    className="shrink-0 data-[state=checked]:border-[#00874a] data-[state=checked]:bg-[#00874a]"
                                    aria-label={`Select ${member.label}`}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] font-medium text-[#1d1d1f]">
                                      {member.label}
                                    </p>
                                    {member.email && (
                                      <p className="truncate text-[12px] text-[#6e6e73]">{member.email}</p>
                                    )}
                                  </div>
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Assign button */}
                      {canManage && selectedIds.size > 0 && (
                        <div className="shrink-0 border-t border-[#e5e5ea] py-3">
                          <Button
                            onClick={() => void handleBulkAssign()}
                            disabled={mutations.bulkAssignMembers.isPending}
                            className="h-10 w-full rounded-xl text-[14px] font-medium text-white"
                            style={{ backgroundColor: ACTION_GREEN }}
                          >
                            <UserCheck className="mr-2 size-4" />
                            {mutations.bulkAssignMembers.isPending
                              ? 'Assigning…'
                              : `Assign ${selectedIds.size} employee${selectedIds.size > 1 ? 's' : ''}`}
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function TaskRow({
  task,
  canManage,
  isEditing,
  editingName,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
}: {
  task: ProjectTaskSummary;
  canManage: boolean;
  isEditing: boolean;
  editingName: string;
  onEditStart: () => void;
  onEditChange: (name: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
}) {
  if (isEditing) {
    return (
      <li className="flex items-center gap-2 rounded-xl bg-[#f5f5f7] px-3 py-2.5">
        <Input
          value={editingName}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEditSave();
            } else if (e.key === 'Escape') {
              onEditCancel();
            }
          }}
          className="h-8 flex-1 text-[14px]"
          autoFocus
        />
        <button
          onClick={onEditSave}
          className="shrink-0 rounded-xl p-1.5 text-[#00874a] transition-colors hover:bg-[#eef9f1]"
          aria-label="Save"
        >
          <CheckCircle2 className="size-3.5" />
        </button>
        <button
          onClick={onEditCancel}
          className="shrink-0 rounded-xl p-1.5 text-[#86868b] transition-colors hover:bg-[#f5f5f7]"
          aria-label="Cancel"
        >
          <X className="size-3.5" />
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f5f5f7]">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-xl bg-[#eef9f1] text-[#156f3d]">
        <CheckCircle2 className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[#1d1d1f]">{task.name}</p>
      </div>
      {canManage && (
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEditStart}
            className="rounded-xl p-1.5 text-[#86868b] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            aria-label="Edit task"
          >
            <Edit2 className="size-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-xl p-1.5 text-[#86868b] transition-colors hover:bg-[#fff0f0] hover:text-[#a12323]"
            aria-label="Delete task"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}

function AssignedMemberRow({
  member,
  canManage,
  isRemoving,
  onRemove,
}: {
  member: ProjectMemberSummary;
  canManage: boolean;
  isRemoving: boolean;
  onRemove: (memberId: string) => Promise<void>;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f5f5f7]">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#eef9f1] text-[12px] font-semibold text-[#156f3d]">
        {(member.name ?? member.email ?? '?').charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[#1d1d1f]">
          {member.name || member.email || member.memberId}
        </p>
        {member.role && (
          <p className="truncate text-[12px] text-[#6e6e73]">{member.role}</p>
        )}
      </div>
      {canManage && (
        <button
          onClick={() => void onRemove(member.memberId)}
          disabled={isRemoving}
          className="shrink-0 rounded-xl p-1.5 text-[#86868b] transition-colors hover:bg-[#fff0f0] hover:text-[#a12323] disabled:opacity-50"
          aria-label={`Remove ${member.name || member.email}`}
        >
          <UserMinus className="size-3.5" />
        </button>
      )}
    </li>
  );
}
