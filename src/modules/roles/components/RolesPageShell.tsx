'use client';

import { useMemo, useState } from 'react';
import { Search, X, ShieldOff, SearchX } from 'lucide-react';
import { useRolesQuery } from '@/modules/roles/hooks/useRolesQuery';
import { useEmployeesQuery } from '@/modules/employees/hooks/useEmployeesQuery';
import { type RoleResponse } from '@/modules/roles/types/role';
import { DeleteRoleDialog } from '@/modules/roles/components/DeleteRoleDialog';
import { RolesTable } from '@/modules/roles/components/RolesTable';
import {
  ExpandableScreen,
  ExpandableScreenTrigger,
  ExpandableScreenContent,
  useExpandableScreen,
} from '@/components/ui/expandable-screen';
import { RoleForm } from '@/modules/roles/components/RoleForm';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SKELETON_IDS = Array.from({ length: 8 }, (_, i) => `skeleton-role-${i}`);

function RolesTableSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
      {SKELETON_IDS.map((id) => (
        <div key={id} className="p-6 bg-white rounded-lg border border-black/5 h-24 flex items-center justify-between animate-pulse">
          <div className="h-5 w-2/3 bg-neutral-200 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Table content sub-component ─────────────────────────────────────────────

interface TableContentProps {
  roleCount: number;
  search: string;
  filteredRoles: RoleResponse[];
  peopleByRoleId: Record<string, { memberId: string; name: string; image: string | null }[]>;
  onEdit: (role: RoleResponse) => void;
  onClearSearch: () => void;
  onCreateFirst: () => void;
  orgSlug: string;
  memberId: string;
}

function TableContent({
  roleCount,
  search,
  filteredRoles,
  peopleByRoleId,
  onEdit,
  onClearSearch,
  onCreateFirst,
  orgSlug,
  memberId,
}: Readonly<TableContentProps>) {
  if (roleCount === 0 && !search.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5 text-center bg-white border border-black/5 rounded-lg shadow-sm mt-6">
        <div className="size-16 rounded-2xl bg-primary-ghost border border-primary-subtle flex items-center justify-center">
          <svg
            width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            strokeLinejoin="round" className="text-primary" aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <div className="max-w-xs">
          <p className="text-base font-semibold text-neutral-900">No roles yet</p>
          <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
            Roles define what your team members can see and do. Create your first role to get started.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateFirst}
          className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors duration-100 active:scale-[0.98]"
        >
          Create your first role
        </button>
      </div>
    );
  }

  if (filteredRoles.length === 0 && search.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-white border border-black/5 rounded-lg shadow-sm mt-6">
        <div className="size-12 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center">
          <SearchX className="size-5 text-neutral-400" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">No roles match</p>
          <p className="text-xs text-neutral-500 mt-1">
            No results for &ldquo;{search}&rdquo;. Try a different name.
          </p>
        </div>
        <button
          type="button"
          onClick={onClearSearch}
          className="text-xs font-medium text-primary hover:text-primary-hover underline underline-offset-2 hover:no-underline"
        >
          Clear search
        </button>
      </div>
    );
  }

  return (
    <RolesTable
      roles={filteredRoles}
      peopleByRoleId={peopleByRoleId}
      onEdit={onEdit}
      orgSlug={orgSlug}
      memberId={memberId}
    />
  );
}

// ─── Inline Expandable Content Component ─────────────────────────────────────

function ExpandedNewRoleContent({
  orgSlug,
  memberId,
}: Readonly<{
  orgSlug: string;
  memberId: string;
}>) {
  const { collapse } = useExpandableScreen();

  return (
    <div className="flex-1 overflow-y-auto p-8 select-text">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Create Role</h2>
        <p className="text-sm text-neutral-500 mt-1">Define a name and configure permissions.</p>
      </div>
      <RoleForm
        mode="create"
        orgSlug={orgSlug}
        memberId={memberId}
        onSuccess={collapse}
        onCancel={collapse}
      />
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export interface RolesPageShellProps {
  orgSlug: string;
  memberId: string;
}

export function RolesPageShell({ orgSlug, memberId }: Readonly<RolesPageShellProps>) {
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<RoleResponse | null>(null);

  const { data: allRoles, filteredRoles, isLoading, isError, refetch } = useRolesQuery(
    orgSlug,
    memberId,
    search,
  );

  const { data: employeesResponse } = useEmployeesQuery(orgSlug, memberId);

  const peopleByRoleId = useMemo(() => {
    const employees = employeesResponse?.items ?? [];
    return employees.reduce<Record<string, { memberId: string; name: string; image: string | null }[]>>(
      (acc, employee) => {
        const roleId = employee.role?.id;
        if (!roleId) return acc;
        if (!acc[roleId]) acc[roleId] = [];
        acc[roleId].push({
          memberId: employee.member_id,
          name: employee.name,
          image: employee.image,
        });
        return acc;
      },
      {},
    );
  }, [employeesResponse?.items]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return <RolesTableSkeleton />;
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="rounded-xl border border-destructive-border bg-destructive-bg p-5 flex items-start gap-4">
        <div className="size-9 rounded-lg bg-destructive-bg border border-destructive-border flex items-center justify-center shrink-0">
          <ShieldOff className="size-4 text-destructive-text" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-destructive-text">Failed to load roles</p>
          <p className="text-xs text-destructive-text/70 mt-0.5">
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-xs font-medium text-destructive-text underline underline-offset-2 hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const roleCount = allRoles?.length ?? 0;

  return (
    <>
      <div className="flex flex-col gap-6">

        {/* ── Layer 1: Top actions ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search — half width */}
          <div className="relative w-full md:w-1/2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles…"
              aria-label="Search roles"
              className="w-full bg-white border border-black/10 rounded-lg pl-9 pr-8 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:outline-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] h-10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* New Role button wrapped in ExpandableScreen */}
          <ExpandableScreen layoutId="new-role" contentRadius="8px">
            <ExpandableScreenTrigger>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#3862f6] to-[#6366f1] px-4 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(56,98,246,0.15)] hover:opacity-95 transition-all duration-200 cursor-pointer shrink-0"
              >
                + New Role
              </button>
            </ExpandableScreenTrigger>
            <ExpandableScreenContent
              className="bg-white border border-[#e5e5ea] shadow-2xl rounded-lg max-w-4xl mx-auto my-auto h-[85vh] flex flex-col overflow-hidden"
              closeButtonClassName="text-neutral-500 hover:text-neutral-800 bg-transparent hover:bg-transparent shadow-none cursor-pointer"
            >
              <ExpandedNewRoleContent orgSlug={orgSlug} memberId={memberId} />
            </ExpandableScreenContent>
          </ExpandableScreen>
        </div>

        <TableContent
          roleCount={roleCount}
          search={search}
          filteredRoles={filteredRoles}
          peopleByRoleId={peopleByRoleId}
          onEdit={() => {}} // inline cards handle edits, so onEdit action is handled inside RolesTable
          onClearSearch={() => setSearch('')}
          onCreateFirst={() => {}} // create button trigger is handled inline in the header
          orgSlug={orgSlug}
          memberId={memberId}
        />
      </div>

      {/* Delete confirmation dialog */}
      <DeleteRoleDialog
        role={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        orgSlug={orgSlug}
        memberId={memberId}
      />
    </>
  );
}
