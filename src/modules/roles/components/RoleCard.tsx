'use client';

import { Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { type RoleResponse, type RolePermissions } from '@/modules/roles/types/role';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ModulePermissions {
  module: string;
  actions: Array<{ action: string; scope: string }>;
}

function deriveModuleGroups(permissions: RolePermissions): ModulePermissions[] {
  return Object.entries(permissions)
    .map(([module, actions]) => ({
      module,
      actions: Object.entries(actions)
        .filter(([, scope]) => scope !== 'none')
        .map(([action, scope]) => ({ action, scope })),
    }))
    .filter((g) => g.actions.length > 0);
}

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getScopePillClasses(scope: string): string {
  switch (scope) {
    case 'organization':
      return 'bg-primary-subtle text-primary';
    case 'department':
      return 'bg-warning-bg text-warning-text';
    case 'team':
      return 'bg-info-bg text-info-text';
    case 'self':
      return 'bg-neutral-50 text-neutral-500 border border-neutral-200';
    default:
      return 'bg-surface-muted text-neutral-400';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface RoleCardProps {
  role: RoleResponse;
  onEdit: (role: RoleResponse) => void;
  onDelete: (role: RoleResponse) => void;
}

const MAX_VISIBLE_MODULES = 3;

export function RoleCard({ role, onEdit, onDelete }: Readonly<RoleCardProps>) {
  const allPills = deriveModuleGroups(role.permissions);
  const visibleGroups = allPills.slice(0, MAX_VISIBLE_MODULES);
  const hiddenCount = allPills.length - MAX_VISIBLE_MODULES;
  const totalPermissions = allPills.reduce((sum, g) => sum + g.actions.length, 0);

  const permissionSuffix = totalPermissions === 1 ? '' : 's';
  const moduleSuffix = allPills.length === 1 ? '' : 's';
  const permissionSummary =
    totalPermissions === 0
      ? 'No permissions'
      : `${totalPermissions} permission${permissionSuffix} across ${allPills.length} module${moduleSuffix}`;
  const hiddenSuffix = hiddenCount === 1 ? '' : 's';

  return (
    <article
      className="
        group
        bg-surface border border-neutral-100 rounded-xl
        shadow-(--shadow-1) hover:shadow-(--shadow-2)
        hover:border-neutral-200
        transition-all duration-150 motion-reduce:transition-none
        flex flex-col overflow-hidden
      "
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-primary-ghost flex items-center justify-center shrink-0">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-neutral-900 leading-snug truncate">
              {role.name}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {permissionSummary}
            </p>
          </div>
        </div>

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 motion-reduce:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(role)}
            aria-label={`Edit ${role.name} role`}
            className="
              size-7 flex items-center justify-center rounded-md
              text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50
              active:scale-95
              transition-all duration-100 motion-reduce:transition-none
            "
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(role)}
            aria-label={`Delete ${role.name} role`}
            className="
              size-7 flex items-center justify-center rounded-md
              text-neutral-400 hover:text-destructive-text hover:bg-destructive-bg
              active:scale-95
              transition-all duration-100 motion-reduce:transition-none
            "
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Divider */}
      {allPills.length > 0 && (
        <div className="h-px bg-neutral-100 mx-4" />
      )}

      {/* Module permission groups */}
      {allPills.length > 0 ? (
        <div className="px-4 py-3 flex flex-col gap-2.5">
          {visibleGroups.map((group) => (
            <div key={group.module} className="flex items-start gap-2">
              <span className="text-[11px] font-medium text-neutral-400 tracking-wide w-20 shrink-0 pt-0.5 capitalize">
                {group.module}
              </span>
              <div className="flex flex-wrap gap-1">
                {group.actions.map(({ action, scope }) => (
                  <span
                    key={`${group.module}-${action}`}
                    className={`
                      text-[11px] font-medium rounded-full px-1.5 py-0.5
                      ${getScopePillClasses(scope)}
                    `}
                  >
                    {toTitleCase(action)}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {hiddenCount > 0 && (
            <p className="text-[11px] text-neutral-400 font-medium">
              +{hiddenCount} more module{hiddenSuffix}
            </p>
          )}
        </div>
      ) : (
        <div className="px-4 py-3">
          <p className="text-xs text-neutral-400 italic">No permissions configured</p>
        </div>
      )}
    </article>
  );
}
