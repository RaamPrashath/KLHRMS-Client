'use client';

import { useMemo, useState } from 'react';
import { Search, X, ShieldOff, SearchX } from 'lucide-react';
import { useRolesQuery } from '@/modules/roles/hooks/useRolesQuery';
import { useEmployeesQuery } from '@/modules/employees/hooks/useEmployeesQuery';
import { type RoleResponse } from '@/modules/roles/types/role';
import { DeleteRoleDialog } from '@/modules/roles/components/DeleteRoleDialog';
import { RolesSlideOver } from '@/modules/roles/components/RolesSlideOver';
import { RolesTable } from '@/modules/roles/components/RolesTable';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SKELETON_IDS = Array.from({ length: 5 }, (_, i) => `skeleton-role-${i}`);

function RolesTableSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-black/3 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
      {/* Top bar skeleton */}
      <div className="p-4 border-b border-neutral-100 flex items-center gap-2">
        <div className="flex-1 h-9 rounded-md bg-neutral-100 animate-pulse" />
        <div className="h-9 w-28 rounded-md bg-neutral-100 animate-pulse shrink-0" />
      </div>
      {/* Header */}
      <div className="border-b border-black/4 bg-canvas px-6 py-3 grid grid-cols-[1fr_1fr_120px] gap-4">
        {['Role Name', 'Members', ''].map((h) => (
          <div key={h} className="h-3 w-20 rounded bg-neutral-200 animate-pulse" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-black/4 bg-white">
        {SKELETON_IDS.map((id) => (
          <div key={id} className="px-6 py-4">
            <div className="h-9 w-full rounded-xl bg-neutral-100 animate-pulse" />
          </div>
        ))}
      </div>
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
}

function TableContent({
  roleCount,
  search,
  filteredRoles,
  peopleByRoleId,
  onEdit,
  onClearSearch,
  onCreateFirst,
}: Readonly<TableContentProps>) {
  if (roleCount === 0 && !search.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5 text-center bg-white">
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
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-white">
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
    />
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
  const [slideOver, setSlideOver] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    role?: RoleResponse | null;
  }>({ open: false, mode: 'create', role: null });

  const { data: allRoles, filteredRoles, isLoading, isError, refetch } = useRolesQuery(
    orgSlug,
    memberId,
    search,
  );

  const { data: employeesResponse } = useEmployeesQuery(orgSlug, memberId, {
    page: 1,
    pageSize: 100,
  });

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

  function openCreate() {
    setSlideOver({ open: true, mode: 'create', role: null });
  }

  function openEdit(role: RoleResponse) {
    setSlideOver({ open: true, mode: 'edit', role });
  }

  function closeSlideOver() {
    setSlideOver((prev) => ({ ...prev, open: false }));
  }

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
      <div className="bg-surface rounded-xl border border-black/3 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">

        {/* ── Layer 1: Top actions ─────────────────────────────────────────── */}
        <div className="p-4 border-b border-neutral-100 bg-surface flex items-center gap-2">
          {/* Search — stretches */}
          <div className="relative flex-1">
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
              className="w-full bg-neutral-50 border border-transparent rounded-md pl-9 pr-8 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-surface focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/10 transition-all duration-150"
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

          {/* New Role button — right */}
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover active:bg-primary-press text-white text-sm font-medium px-4 py-2 rounded-md shrink-0 transition-colors duration-100 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            + New Role
          </button>
        </div>

        {/* ── Layer 2: Table header ────────────────────────────────────────── */}
        {/* ── Layer 3: Table body ──────────────────────────────────────────── */}
        <TableContent
          roleCount={roleCount}
          search={search}
          filteredRoles={filteredRoles}
          peopleByRoleId={peopleByRoleId}
          onEdit={openEdit}
          onClearSearch={() => setSearch('')}
          onCreateFirst={openCreate}
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

      {/* Create / Edit slide-over */}
      <RolesSlideOver
        open={slideOver.open}
        mode={slideOver.mode}
        orgSlug={orgSlug}
        memberId={memberId}
        role={slideOver.role}
        onClose={closeSlideOver}
      />
    </>
  );
}
