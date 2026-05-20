'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar';
import { type RoleResponse } from '@/modules/roles/types/role';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';

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
          <Avatar key={a.memberId} className="size-7 ring-1 ring-white dark:ring-neutral-900">
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
    <Table className="table-fixed min-w-[500px]">
      <colgroup>
        <col style={{ width: '35%' }} />
        <col style={{ width: '45%' }} />
        <col style={{ width: '20%' }} />
      </colgroup>

      {/* Layer 2: Table header */}
      <TableHeader className="bg-canvas border-b border-black/4">
        <TableRow className="border-b-0 hover:bg-transparent">
          <TableHead className="h-12 px-6 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-left">
            Role Name
          </TableHead>
          <TableHead className="h-12 px-6 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-left">
            Members
          </TableHead>
          <TableHead className="h-12 px-6 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-right">
            {/* actions column — no label, right-aligned */}
          </TableHead>
        </TableRow>
      </TableHeader>

      {/* Layer 3: Table body */}
      <TableBody className="bg-white">
        {roles.map((role) => {
          const assignees = peopleByRoleId[role.id] ?? [];
          return (
            <TableRow
              key={role.id}
              className="border-b border-black/4 transition-colors hover:bg-canvas/60"
            >
              {/* Role name */}
              <TableCell className="px-6 py-4 whitespace-normal">
                <span className="text-[15px] font-medium text-neutral-900">
                  {role.name}
                </span>
              </TableCell>

              {/* Members */}
              <TableCell className="px-6 py-4 whitespace-normal">
                <MembersCell assignees={assignees} />
              </TableCell>

              {/* Edit action — aligned right to match header */}
              <TableCell className="px-6 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(role)}
                  className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] border border-neutral-100 transition-all hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 active:scale-[0.98] duration-100 shrink-0"
                >
                  Edit Role
                </button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
