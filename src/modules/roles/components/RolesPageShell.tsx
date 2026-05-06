'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ShieldOff, SearchX } from 'lucide-react';
import { useRolesQuery } from '@/modules/roles/hooks/useRolesQuery';
import { useEmployeesQuery } from '@/modules/employees/hooks/useEmployeesQuery';
import { type RoleResponse } from '@/modules/roles/types/role';
import { RolesSearchInput } from '@/modules/roles/components/RolesSearchInput';
import { RolesGrid } from '@/modules/roles/components/RolesGrid';
import { DeleteRoleDialog } from '@/modules/roles/components/DeleteRoleDialog';
import { RolesSlideOver } from '@/modules/roles/components/RolesSlideOver';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RoleCardSkeleton({ delay = 0 }: Readonly<{ delay?: number }>) {
  return (
    <div
      className="bg-surface border border-neutral-100 rounded-xl overflow-hidden animate-pulse motion-reduce:animate-none"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-surface-muted" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3.5 w-28 bg-surface-muted rounded" />
            <div className="h-2.5 w-20 bg-surface-muted rounded" />
          </div>
        </div>
      </div>
      <div className="h-px bg-neutral-100 mx-4" />
      {/* Rows */}
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {[80, 64, 96].map((w) => (
          <div key={w} className="flex items-center gap-2">
            <div className="h-2.5 w-16 bg-surface-muted rounded" />
            <div className={`h-5 bg-surface-muted rounded-full`} style={{ width: w }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface RolesPageShellProps {
  orgSlug: string;
  memberId: string;
  /** Passed from the page to open create panel immediately */
  openCreate?: boolean;
}

export function RolesPageShell({ orgSlug, memberId }: Readonly<RolesPageShellProps>) {
  const shouldReduceMotion = useReducedMotion();
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

        if (!acc[roleId]) {
          acc[roleId] = [];
        }

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

  const roleCount = allRoles?.length ?? 0;

  function openCreate() {
    setSlideOver({ open: true, mode: 'create', role: null });
  }

  function openEdit(role: RoleResponse) {
    setSlideOver({ open: true, mode: 'edit', role });
  }

  function closeSlideOver() {
    setSlideOver((prev) => ({ ...prev, open: false }));
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
      >
        <RoleCardSkeleton delay={0} />
        <RoleCardSkeleton delay={60} />
        <RoleCardSkeleton delay={120} />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border border-destructive-border bg-destructive-bg p-5 flex items-start gap-4"
      >
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
      </motion.div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Toolbar: search + create */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <RolesSearchInput value={search} onChange={setSearch} />
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="
              inline-flex items-center gap-2
              bg-primary hover:bg-primary-hover active:bg-primary-press
              text-white text-sm font-medium
              px-4 py-2 rounded-md shrink-0
              focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
              transition-colors duration-100 motion-reduce:transition-none
              active:scale-[0.98]
            "
          >
            + New Role
          </button>
        </div>

        {/* Role count */}
        {roleCount > 0 && !search.trim() && (
          <p className="text-xs text-neutral-400 font-medium -mt-1">
            {roleCount} role{roleCount !== 1 ? 's' : ''}
          </p>
        )}

        <AnimatePresence mode="wait">
          {/* Empty state — no roles at all */}
          {filteredRoles.length === 0 && !search.trim() && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-5 text-center"
            >
              <div className="size-16 rounded-2xl bg-primary-ghost border border-primary-subtle flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                  aria-hidden="true"
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
                onClick={openCreate}
                className="
                  bg-primary hover:bg-primary-hover active:bg-primary-press
                  text-white text-sm font-medium
                  px-5 py-2.5 rounded-md
                  transition-colors duration-100 motion-reduce:transition-none
                  active:scale-[0.98]
                "
              >
                Create your first role
              </button>
            </motion.div>
          )}

          {/* Empty search state */}
          {filteredRoles.length === 0 && search.trim() && (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
              className="flex flex-col items-center justify-center py-16 gap-3 text-center"
            >
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
                onClick={() => setSearch('')}
                className="text-xs font-medium text-primary hover:text-primary-hover underline underline-offset-2 hover:no-underline"
              >
                Clear search
              </button>
            </motion.div>
          )}

          {/* Roles grid */}
          {filteredRoles.length > 0 && (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <RolesGrid
                roles={filteredRoles}
                peopleByRoleId={peopleByRoleId}
                onEdit={openEdit}
                onDelete={(role) => setDeleteTarget(role)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteRoleDialog
        role={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
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
