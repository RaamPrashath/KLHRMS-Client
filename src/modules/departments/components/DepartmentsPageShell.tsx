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
import { DepartmentsTable } from './DepartmentsTable';
import { DepartmentDetailDialog } from './DepartmentDetailDialog';
import { useDepartmentsQuery, useDepartmentMetaQuery } from '@/modules/departments/hooks/useDepartmentsQuery';
import { useDepartmentMutations } from '@/modules/departments/hooks/useDepartmentMutations';
import type { DepartmentInput } from '@/modules/departments/schema/departmentSchemas';
import type { DepartmentSummary, DepartmentStatus } from '@/modules/departments/types/departmentTypes';

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

function readError(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse((error as Error)?.message ?? '{}');
    return parsed.message || fallback;
  } catch {
    return fallback;
  }
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
  const [pageSize, setPageSize] = useState(10);

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentSummary | null>(null);
  const [departmentForm, setDepartmentForm] = useState<DepartmentInput>(defaultDepartmentForm);

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

  async function handleDeleteDepartment() {
    if (!deleteId) return;
    try {
      await mutations.deleteDepartment.mutateAsync(deleteId);
      setDeleteId(null);
      setDetailOpen(false);
      toast.success('Department removed');
    } catch (error) {
      toast.error(readError(error, 'Failed to remove department'));
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
          <button
            type="button"
            onClick={openDepartmentCreateDialog}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#3862f6] to-[#6366f1] px-4 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(56,98,246,0.15)] hover:opacity-95 transition-all duration-200 cursor-pointer"
          >
            <Plus className="mr-2 size-4" />
            Create department
          </button>
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
              Create the department and assign a department head without waiting on a page reload.
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

      {/* ── Delete confirmation ──────────────────────────────────────────────── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border border-[#e5e5ea] bg-white shadow-2xl rounded-[18px] overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[24px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
              Remove department
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] leading-6 text-[#6e6e73]">
              This removes the department from active use. Review department membership before you continue.
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
      />

    </div>
  );
}
