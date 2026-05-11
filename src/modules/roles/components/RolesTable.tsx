'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar';
import { type RoleResponse } from '@/modules/roles/types/role';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoleAssignee {
  memberId: string;
  name: string;
  image: string | null;
}

interface RolesTableProps {
  roles: RoleResponse[];
  peopleByRoleId: Record<string, RoleAssignee[]>;
  onEdit: (role: RoleResponse) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Members cell ─────────────────────────────────────────────────────────────

const MAX_VISIBLE = 4;

function MembersCell({ assignees }: Readonly<{ assignees: RoleAssignee[] }>) {
  if (assignees.length === 0) {
    return <span className="text-sm text-neutral-400">No members</span>;
  }

  const visible = assignees.slice(0, MAX_VISIBLE);
  const overflow = assignees.length - visible.length;

  if (assignees.length === 1) {
    return (
      <div className="flex items-center gap-2.5">
        <Avatar className="size-7 ring-1 ring-black/4">
          <AvatarImage src={assignees[0].image ?? undefined} alt={assignees[0].name} />
          <AvatarFallback className="bg-primary-subtle text-[11px] font-medium text-primary">
            {getInitials(assignees[0].name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-neutral-600">{assignees[0].name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <AvatarGroup>
        {visible.map((a) => (
          <Avatar key={a.memberId} className="size-7 ring-1 ring-white">
            <AvatarImage src={a.image ?? undefined} alt={a.name} />
            <AvatarFallback className="bg-primary-subtle text-[11px] font-medium text-primary">
              {getInitials(a.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {overflow > 0 && (
          <AvatarGroupCount className="size-7 bg-neutral-50 text-[11px] font-medium text-neutral-500">
            +{overflow}
          </AvatarGroupCount>
        )}
      </AvatarGroup>
      <span className="text-sm text-neutral-500">
        {assignees.length} {assignees.length === 1 ? 'member' : 'members'}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RolesTable({ roles, peopleByRoleId, onEdit }: Readonly<RolesTableProps>) {
  return (
    <div className="overflow-x-auto w-full bg-white">
      <table className="w-full table-fixed border-collapse min-w-[500px]">
        <colgroup>
          <col style={{ width: '35%' }} />
          <col style={{ width: '45%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>

        {/* Layer 2: Table header */}
        <thead>
          <tr className="border-b border-black/4 bg-canvas">
            <th className="px-6 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-left">
              Role Name
            </th>
            <th className="px-6 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-left">
              Members
            </th>
            <th className="px-6 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-left">
              {/* actions column — no label */}
            </th>
          </tr>
        </thead>

        {/* Layer 3: Table body */}
        <tbody className="divide-y divide-black/4 bg-white">
          {roles.map((role) => {
            const assignees = peopleByRoleId[role.id] ?? [];
            return (
              <tr
                key={role.id}
                className="border-b border-black/4 transition-colors hover:bg-canvas/60"
              >
                {/* Role name */}
                <td className="px-6 py-4">
                  <span className="text-[15px] font-medium text-neutral-900">
                    {role.name}
                  </span>
                </td>

                {/* Members */}
                <td className="px-6 py-4">
                  <MembersCell assignees={assignees} />
                </td>

                {/* Edit action */}
                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => onEdit(role)}
                    className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] transition-all hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                  >
                    Edit Role
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
