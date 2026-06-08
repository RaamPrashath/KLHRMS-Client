'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Crown, Edit2, Search, Trash2, UserCheck, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';

import { cn } from '@/lib/utils';
import { useDepartmentMutations } from '@/modules/departments/hooks/useDepartmentMutations';
import {
  departmentSchema,
  type DepartmentInput,
} from '@/modules/departments/schema/departmentSchemas';
import type {
  DepartmentHeadSummary,
  DepartmentMemberSummary,
  DepartmentSummary,
  LookupOption,
} from '@/modules/departments/types/departmentTypes';

function TabBar({
  tabs,
  value,
  onValueChange,
}: {
  tabs: { value: string; label: string; count?: number }[];
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <div
      className="grid w-full grid-cols-2 rounded-xl border border-black/4 bg-neutral-50 p-1"
    >
      {tabs.map((tab, idx) => (
        <button
          key={tab.value}
          data-tab-index={idx}
          type="button"
          onClick={() => onValueChange(tab.value)}
          className={cn(
            'relative z-10 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-colors duration-200',
            value === tab.value
              ? 'bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
              : 'text-neutral-500 hover:text-neutral-900',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-xs',
              value === tab.value ? 'text-primary/70' : 'text-neutral-400',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

const ACTION_GREEN = 'var(--indigo-9)';

function readError(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse((error as Error)?.message ?? '{}');
    return parsed.message || fallback;
  } catch {
    return fallback;
  }
}

interface DepartmentViewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentSummary | undefined;
  isLoading: boolean;
  canManage: boolean;
  orgSlug: string;
  memberId: string;
  allOrgMembers: LookupOption[];
}

export function DepartmentViewDrawer({
  isOpen,
  onClose,
  department,
  isLoading,
  canManage,
  orgSlug,
  memberId,
  allOrgMembers,
}: DepartmentViewDrawerProps) {
  const mutations = useDepartmentMutations(orgSlug, memberId);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'heads'>('members');
  const [memberTab, setMemberTab] = useState<'assigned' | 'unassigned'>('assigned');
  const [headTab, setHeadTab] = useState<'assigned' | 'unassigned'>('assigned');

  // Member state
  const [unassignedMemberSearch, setUnassignedMemberSearch] = useState('');
  const [assignedMemberSearch, setAssignedMemberSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

  // Head state
  const [unassignedHeadSearch, setUnassignedHeadSearch] = useState('');

  const deferredUnassignedMemberSearch = useDeferredValue(unassignedMemberSearch);
  const deferredAssignedMemberSearch = useDeferredValue(assignedMemberSearch);
  const deferredUnassignedHeadSearch = useDeferredValue(unassignedHeadSearch);

  const form = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      headMemberId: '',
      parentDepartmentId: '',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (department) {
      form.reset({
        name: department.name,
        headMemberId: department.headMemberId ?? '',
        parentDepartmentId: department.parentDepartmentId ?? '',
        status: department.status,
      });
    }
  }, [department, form]);

  const assignedMemberIds = useMemo(
    () => new Set((department?.members ?? []).map((m) => m.memberId)),
    [department?.members],
  );

  const headMemberIds = useMemo(
    () => new Set((department?.heads ?? []).map((h) => h.memberId)),
    [department?.heads],
  );

  // Members
  const unassignedMembers = useMemo(() => {
    const term = deferredUnassignedMemberSearch.toLowerCase().trim();
    return allOrgMembers.filter((m) => {
      if (assignedMemberIds.has(m.id)) return false;
      if (!term) return true;
      return (
        m.label.toLowerCase().includes(term) ||
        (m.email ?? '').toLowerCase().includes(term)
      );
    });
  }, [allOrgMembers, assignedMemberIds, deferredUnassignedMemberSearch]);

  const assignedMembers = useMemo(() => {
    const term = deferredAssignedMemberSearch.toLowerCase().trim();
    return (department?.members ?? []).filter((m) => {
      if (!term) return true;
      const name = (m.name ?? '').toLowerCase();
      const email = (m.email ?? '').toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [department?.members, deferredAssignedMemberSearch]);

  // Heads
  const unassignedHeads = useMemo(() => {
    const term = deferredUnassignedHeadSearch.toLowerCase().trim();
    return allOrgMembers.filter((m) => {
      if (headMemberIds.has(m.id)) return false;
      if (!term) return true;
      return (
        m.label.toLowerCase().includes(term) ||
        (m.email ?? '').toLowerCase().includes(term)
      );
    });
  }, [allOrgMembers, headMemberIds, deferredUnassignedHeadSearch]);

  function toggleMemberSelect(id: string) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkAssignMembers() {
    if (!department || selectedMemberIds.size === 0) return;
    try {
      await mutations.bulkAssignMembers.mutateAsync({
        departmentId: department.id,
        memberIds: Array.from(selectedMemberIds),
      });
      setSelectedMemberIds(new Set());
      toast.success(`${selectedMemberIds.size} Employee${selectedMemberIds.size > 1 ? 's' : ''} Assigned`);
    } catch (error) {
      toast.error(readError(error, 'Failed to assign employees'));
    }
  }

  async function handleRemoveMember(targetMemberId: string) {
    if (!department) return;
    try {
      await mutations.removeMember.mutateAsync({
        departmentId: department.id,
        targetMemberId,
      });
      toast.success('Employee Removed');
    } catch (error) {
      toast.error(readError(error, 'Failed to remove employee'));
    }
  }

  async function handleAssignHead(headMemberId: string) {
    if (!department) return;
    try {
      await mutations.assignHead.mutateAsync({
        departmentId: department.id,
        headMemberId,
      });
      toast.success('Department Head Assigned');
    } catch (error) {
      toast.error(readError(error, 'Failed to assign department head'));
    }
  }

  async function handleRemoveHead(targetHeadId: string) {
    if (!department) return;
    try {
      await mutations.removeHead.mutateAsync({
        departmentId: department.id,
        headMemberId: targetHeadId,
      });
      toast.success('Department Head Removed');
    } catch (error) {
      toast.error(readError(error, 'Failed to remove department head'));
    }
  }

  async function handleUpdate(values: DepartmentInput) {
    if (!department) return;
    try {
      await mutations.updateDepartment.mutateAsync({
        departmentId: department.id,
        data: values,
      });
      setIsEditing(false);
      toast.success('Department Updated');
    } catch (error) {
      toast.error(readError(error, 'Failed to update department'));
    }
  }

  async function handleDelete() {
    if (!department) return;
    if (!confirm(`Delete "${department.name}"? This Action Cannot Be Undone.`)) return;
    try {
      await mutations.deleteDepartment.mutateAsync(department.id);
      onClose();
      toast.success('Department Deleted');
    } catch (error) {
      toast.error(readError(error, 'Failed to delete department'));
    }
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={department ? `${department.name} Details` : 'Department Details'}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[40%] sm:min-w-[360px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {isLoading && !department ? (
          <div className="flex flex-col gap-4 p-8">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : !department ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-[15px] text-[#6e6e73]">Unable To Load Department Details.</p>
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
                        Edit Department
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          form.reset();
                        }}
                        className="flex size-8 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                        aria-label="Cancel Editing"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label htmlFor="edit-name" className="mb-1 block text-[12px] font-medium text-[#1d1d1f]">
                          Department Name
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
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          form.reset();
                        }}
                        className="flex-1 h-9 rounded-lg text-[13px]"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={mutations.updateDepartment.isPending}
                        className="flex-1 h-9 rounded-lg text-[13px] text-white"
                        style={{ backgroundColor: ACTION_GREEN }}
                      >
                        {mutations.updateDepartment.isPending ? 'Saving' : 'Save Changes'}
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
                        Department
                      </p>
                      <h2 className="mt-1 truncate text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f]">
                        {department.name}
                      </h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pt-1">
                      <button
                        onClick={onClose}
                        className="flex size-8 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                        aria-label="Close Drawer"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  {department.headMemberName && (
                    <p className="mt-2 text-[14px] leading-relaxed text-[#6e6e73]">
                      Led By {department.headMemberName}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-[#6e6e73]">
                    <span>
                      <span className="font-medium text-[#1d1d1f]">{department.memberCount}</span> Members
                    </span>
                    <span>
                      <span className="font-medium text-[#1d1d1f]">{department.heads.length}</span> Head{department.heads.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs with Edit/Delete buttons */}
            <div className="flex min-h-0 flex-1 flex-col">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'members' | 'heads')} className="flex min-h-0 flex-1 flex-col">
                <div className="mx-6 mt-4 mb-0 flex shrink-0 items-center gap-2">
                  <div className="flex-1">
                    <TabBar
                      tabs={[
                        { value: 'members', label: 'Members', count: department.members.length },
                        { value: 'heads', label: 'Heads', count: department.heads.length },
                      ]}
                      value={activeTab}
                      onValueChange={(v) => setActiveTab(v as 'members' | 'heads')}
                    />
                  </div>

                  {canManage && !isEditing && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex size-9 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                        aria-label="Edit Department"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => void handleDelete()}
                        disabled={mutations.deleteDepartment.isPending}
                        className="flex size-9 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-[#fff0f0] hover:text-[#a12323] disabled:opacity-50"
                        aria-label="Delete Department"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Members tab */}
                <TabsContent value="members" className="mt-0 flex min-h-0 flex-1 flex-col px-6 pt-4">
                  <Tabs value={memberTab} onValueChange={(v) => setMemberTab(v as 'assigned' | 'unassigned')} className="flex min-h-0 flex-1 flex-col">
                    <div className="mb-3 shrink-0">
                      <TabBar
                        tabs={[
                          { value: 'assigned', label: 'Assigned', count: department.members.length },
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

                    {/* Assigned members */}
                    <TabsContent value="assigned" className="mt-0 flex min-h-0 flex-1 flex-col">
                      <div className="relative mb-3 shrink-0">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86868b]" />
                        <Input
                          value={assignedMemberSearch}
                          onChange={(e) => setAssignedMemberSearch(e.target.value)}
                          placeholder="Search Assigned"
                          className="h-10 rounded-lg border-[#e5e5ea] pl-9 text-[14px] shadow-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto">
                        {assignedMembers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="size-8 text-[#86868b]" />
                            <p className="mt-3 text-[14px] font-medium text-[#1d1d1f]">
                              {deferredAssignedMemberSearch ? 'No Results' : 'No Employees Assigned Yet'}
                            </p>
                            <p className="mt-1 text-[13px] text-[#6e6e73]">
                              {deferredAssignedMemberSearch
                                ? 'Try A Different Search Term.'
                                : 'Switch To The Unassigned Tab To Add People.'}
                            </p>
                          </div>
                        ) : (
                          <ul className="space-y-1 pb-4">
                            {assignedMembers.map((member) => (
                              <AssignedMemberRow
                                key={member.id}
                                member={member}
                                canManage={canManage}
                                onRemove={handleRemoveMember}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    </TabsContent>

                    {/* Unassigned members */}
                    <TabsContent value="unassigned" className="mt-0 flex min-h-0 flex-1 flex-col">
                      <div className="relative mb-3 shrink-0">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86868b]" />
                        <Input
                          value={unassignedMemberSearch}
                          onChange={(e) => setUnassignedMemberSearch(e.target.value)}
                          placeholder="Search Employees"
                          className="h-10 rounded-lg border-[#e5e5ea] pl-9 text-[14px] shadow-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto">
                        {unassignedMembers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="size-8 text-[#86868b]" />
                            <p className="mt-3 text-[14px] font-medium text-[#1d1d1f]">
                              {deferredUnassignedMemberSearch ? 'No Results' : 'All Employees Assigned'}
                            </p>
                            <p className="mt-1 text-[13px] text-[#6e6e73]">
                              {deferredUnassignedMemberSearch
                                ? 'Try A Different Search Term.'
                                : 'Every Org Member Is Already In This Department.'}
                            </p>
                          </div>
                        ) : (
                          <ul className="space-y-1 pb-4">
                            {unassignedMembers.map((member) => (
                              <li key={member.id}>
                                <label
                                  className={cn(
                                    'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f5f5f7]',
                                    selectedMemberIds.has(member.id) && 'bg-primary/5',
                                  )}
                                >
                                  <Checkbox
                                    checked={selectedMemberIds.has(member.id)}
                                    onCheckedChange={() => toggleMemberSelect(member.id)}
                                    className="shrink-0 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
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

                      {canManage && selectedMemberIds.size > 0 && (
                        <div className="shrink-0 border-t border-[#e5e5ea] py-3">
                          <Button
                            onClick={() => void handleBulkAssignMembers()}
                            disabled={mutations.bulkAssignMembers.isPending}
                            className="h-10 w-full rounded-lg text-[14px] font-medium text-white"
                            style={{ backgroundColor: ACTION_GREEN }}
                          >
                            <UserCheck className="mr-2 size-4" />
                            {mutations.bulkAssignMembers.isPending
                              ? 'Assigning'
                              : `Assign ${selectedMemberIds.size} Employee${selectedMemberIds.size > 1 ? 's' : ''}`}
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {/* Heads tab */}
                <TabsContent value="heads" className="mt-0 flex min-h-0 flex-1 flex-col px-6 pt-4">
                  <Tabs value={headTab} onValueChange={(v) => setHeadTab(v as 'assigned' | 'unassigned')} className="flex min-h-0 flex-1 flex-col">
                    <div className="mb-3 shrink-0">
                      <TabBar
                        tabs={[
                          { value: 'assigned', label: 'Assigned', count: department.heads.length },
                          {
                            value: 'unassigned',
                            label: 'Unassigned',
                            count: allOrgMembers.filter((m) => !headMemberIds.has(m.id)).length,
                          },
                        ]}
                        value={headTab}
                        onValueChange={(v) => setHeadTab(v as 'assigned' | 'unassigned')}
                      />
                    </div>

                    {/* Assigned heads */}
                    <TabsContent value="assigned" className="mt-0 flex min-h-0 flex-1 flex-col">
                      <div className="min-h-0 flex-1 overflow-y-auto">
                        {department.heads.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Crown className="size-8 text-[#86868b]" />
                            <p className="mt-3 text-[14px] font-medium text-[#1d1d1f]">
                              No Department Heads
                            </p>
                            <p className="mt-1 text-[13px] text-[#6e6e73]">
                              Switch To The Unassigned Tab To Assign A Head.
                            </p>
                          </div>
                        ) : (
                          <ul className="space-y-1 pb-4">
                            {department.heads.map((head) => (
                              <AssignedHeadRow
                                key={head.id}
                                head={head}
                                canManage={canManage}
                                onRemove={handleRemoveHead}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    </TabsContent>

                    {/* Unassigned heads */}
                    <TabsContent value="unassigned" className="mt-0 flex min-h-0 flex-1 flex-col">
                      <div className="relative mb-3 shrink-0">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86868b]" />
                        <Input
                          value={unassignedHeadSearch}
                          onChange={(e) => setUnassignedHeadSearch(e.target.value)}
                          placeholder="Search Employees"
                          className="h-10 rounded-lg border-[#e5e5ea] pl-9 text-[14px] shadow-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto">
                        {unassignedHeads.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Crown className="size-8 text-[#86868b]" />
                            <p className="mt-3 text-[14px] font-medium text-[#1d1d1f]">
                              {deferredUnassignedHeadSearch ? 'No Results' : 'All Employees Are Heads'}
                            </p>
                            <p className="mt-1 text-[13px] text-[#6e6e73]">
                              {deferredUnassignedHeadSearch
                                ? 'Try A Different Search Term.'
                                : 'Every Org Member Is Already A Department Head.'}
                            </p>
                          </div>
                        ) : (
                          <ul className="space-y-1 pb-4">
                            {unassignedHeads.map((member) => (
                              <UnassignedHeadRow
                                key={member.id}
                                member={member}
                                canManage={canManage}
                                isAssigning={mutations.assignHead.isPending}
                                onAssign={handleAssignHead}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
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

function AssignedMemberRow({
  member,
  canManage,
  onRemove,
}: {
  member: DepartmentMemberSummary;
  canManage: boolean;
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
        {member.email && (
          <p className="truncate text-[12px] text-[#6e6e73]">{member.email}</p>
        )}
      </div>
      {canManage && (
        <button
          onClick={() => void onRemove(member.memberId)}
          className="shrink-0 rounded-xl p-1.5 text-[#86868b] transition-colors hover:bg-[#fff0f0] hover:text-[#a12323]"
          aria-label={`Remove ${member.name || member.email}`}
        >
          <UserMinus className="size-3.5" />
        </button>
      )}
    </li>
  );
}

function AssignedHeadRow({
  head,
  canManage,
  onRemove,
}: {
  head: DepartmentHeadSummary;
  canManage: boolean;
  onRemove: (memberId: string) => Promise<void>;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f5f5f7]">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#fff7e8] text-[12px] font-semibold text-[#8a5a00]">
        <Crown className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[#1d1d1f]">
          {head.name || head.email || head.memberId}
        </p>
        {head.email && (
          <p className="truncate text-[12px] text-[#6e6e73]">{head.email}</p>
        )}
      </div>
      {canManage && (
        <button
          onClick={() => void onRemove(head.memberId)}
          className="shrink-0 rounded-xl p-1.5 text-[#86868b] transition-colors hover:bg-[#fff0f0] hover:text-[#a12323]"
          aria-label={`Remove ${head.name || head.email}`}
        >
          <UserMinus className="size-3.5" />
        </button>
      )}
    </li>
  );
}

function UnassignedHeadRow({
  member,
  canManage,
  isAssigning,
  onAssign,
}: {
  member: LookupOption;
  canManage: boolean;
  isAssigning: boolean;
  onAssign: (memberId: string) => Promise<void>;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f5f5f7]">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f7] text-[12px] font-semibold text-[#6e6e73]">
        {member.label.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[#1d1d1f]">
          {member.label}
        </p>
        {member.email && (
          <p className="truncate text-[12px] text-[#6e6e73]">{member.email}</p>
        )}
      </div>
      {canManage && (
        <button
          onClick={() => void onAssign(member.id)}
          disabled={isAssigning}
          className="shrink-0 rounded-xl p-1.5 text-[#86868b] transition-colors hover:bg-[#eef9f1] hover:text-[#156f3d] disabled:opacity-50"
          aria-label={`Assign ${member.label} As Head`}
        >
          <UserPlus className="size-3.5" />
        </button>
      )}
    </li>
  );
}
