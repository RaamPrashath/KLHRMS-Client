'use client';

import type { RoleResponse } from '@/modules/roles/types/role';
import {
  ExpandableScreen,
  ExpandableScreenTrigger,
  ExpandableScreenContent,
  useExpandableScreen,
} from '@/components/ui/expandable-screen';
import { RoleForm } from '@/modules/roles/components/RoleForm';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar';

interface RoleAssignee {
  memberId: string;
  name: string;
  image: string | null;
}

interface RolesTableProps {
  roles: RoleResponse[];
  peopleByRoleId: Record<string, RoleAssignee[]>;
  onEdit: (role: RoleResponse) => void;
  orgSlug: string;
  memberId: string;
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

const MAX_VISIBLE = 4;

function MembersCell({ assignees }: Readonly<{ assignees: RoleAssignee[] }>) {
  if (assignees.length === 0) {
    return <span className="text-xs text-neutral-400 font-medium">No members</span>;
  }

  const visible = assignees.slice(0, MAX_VISIBLE);
  const overflow = assignees.length - visible.length;

  return (
    <div className="flex items-center gap-2">
      <AvatarGroup>
        {visible.map((a) => (
          <Avatar key={a.memberId} className="size-6 ring-1 ring-white dark:ring-neutral-900">
            <AvatarImage src={a.image ?? undefined} alt={a.name} />
            <AvatarFallback className="bg-primary-subtle text-[9px] font-semibold text-primary">
              {getInitials(a.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {overflow > 0 && (
          <AvatarGroupCount className="size-6 bg-neutral-50 text-[9px] font-semibold text-neutral-500">
            +{overflow}
          </AvatarGroupCount>
        )}
      </AvatarGroup>
      <span className="text-[11px] text-neutral-500 font-semibold leading-none">
        {assignees.length} {assignees.length === 1 ? 'member' : 'members'}
      </span>
    </div>
  );
}

// ─── Inline Expandable Content Component ─────────────────────────────────────

function ExpandedRoleContent({
  role,
  orgSlug,
  memberId,
}: Readonly<{
  role: RoleResponse;
  orgSlug: string;
  memberId: string;
}>) {
  const { collapse } = useExpandableScreen();

  return (
    <div className="flex-1 overflow-y-auto p-8 select-text">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Edit Role Permissions</h2>
        <p className="text-sm text-neutral-500 mt-1">Configure name and active permissions for {role.name}.</p>
      </div>
      <RoleForm
        mode="edit"
        orgSlug={orgSlug}
        memberId={memberId}
        initialRole={role}
        onSuccess={collapse}
        onCancel={collapse}
      />
    </div>
  );
}

export function RolesTable({ roles, peopleByRoleId, orgSlug, memberId }: Readonly<RolesTableProps>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
      {roles.map((role) => {
        const assignees = peopleByRoleId[role.id] ?? [];
        return (
          <ExpandableScreen key={role.id} layoutId={`role-${role.id}`} contentRadius="8px">
            <ExpandableScreenTrigger className="w-full">
              <div className="p-6 bg-white rounded-lg border border-black/5 hover:border-indigo-500 hover:shadow-md transition-all duration-200 cursor-pointer h-28 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-left">
                <span className="text-[16px] font-bold text-neutral-900 truncate" title={role.name}>
                  {role.name}
                </span>
                <div className="flex items-center pt-2 border-t border-black/5 w-full">
                  <MembersCell assignees={assignees} />
                </div>
              </div>
            </ExpandableScreenTrigger>
            <ExpandableScreenContent
              className="bg-white border border-[#e5e5ea] shadow-2xl rounded-lg max-w-4xl mx-auto my-auto h-[85vh] flex flex-col overflow-hidden"
              closeButtonClassName="text-neutral-500 hover:text-neutral-800 bg-transparent hover:bg-transparent shadow-none cursor-pointer"
            >
              <ExpandedRoleContent
                role={role}
                orgSlug={orgSlug}
                memberId={memberId}
              />
            </ExpandableScreenContent>
          </ExpandableScreen>
        );
      })}
    </div>
  );
}
