'use client';

import { Shield, UserCog, Users } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar';
import { type RoleResponse } from '@/modules/roles/types/role';

interface RoleAssignee {
  memberId: string;
  name: string;
  image: string | null;
}

export interface RoleCardProps {
  role: RoleResponse;
  assignees?: RoleAssignee[];
  onEdit: (role: RoleResponse) => void;
  onDelete: (role: RoleResponse) => void;
}

function getRoleIcon(roleName: string) {
  const normalizedRole = roleName.toLowerCase();

  if (
    normalizedRole.includes('owner') ||
    normalizedRole.includes('admin') ||
    normalizedRole.includes('security')
  ) {
    return Shield;
  }

  if (
    normalizedRole.includes('manager') ||
    normalizedRole.includes('lead') ||
    normalizedRole.includes('hr')
  ) {
    return UserCog;
  }

  return Users;
}

function renderRoleIcon(roleName: string) {
  const Icon = getRoleIcon(roleName);
  return <Icon className="size-[18px] text-primary" strokeWidth={1.9} aria-hidden="true" />;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function RoleCard({ role, assignees = [], onEdit }: Readonly<RoleCardProps>) {
  const visibleAssignees = assignees.slice(0, 3);
  const remainingAssigneeCount = Math.max(assignees.length - visibleAssignees.length, 0);

  return (
    <div className="group flex items-center justify-between gap-6 px-6 py-6 transition-colors hover:bg-primary/[0.02]">
      <div className="flex min-w-0 items-center gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-sans text-[15px] font-medium text-neutral-900">
            {role.name}
          </h3>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {assignees.length > 0 ? (
          assignees.length === 1 ? (
            <div className="flex items-center gap-3">
              <Avatar size="sm" className="ring-1 ring-black/[0.04]">
                <AvatarImage src={assignees[0].image ?? undefined} alt={assignees[0].name} />
                <AvatarFallback className="bg-primary/[0.08] text-[11px] font-medium text-primary">
                  {getInitials(assignees[0].name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-neutral-500">{assignees[0].name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <AvatarGroup>
                {visibleAssignees.map((assignee) => (
                  <Avatar key={assignee.memberId} size="sm" className="ring-1 ring-white">
                    <AvatarImage src={assignee.image ?? undefined} alt={assignee.name} />
                    <AvatarFallback className="bg-primary/[0.08] text-[11px] font-medium text-primary">
                      {getInitials(assignee.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {remainingAssigneeCount > 0 ? (
                  <AvatarGroupCount className="size-6 bg-neutral-50 text-[11px] font-medium text-neutral-500">
                    +{remainingAssigneeCount}
                  </AvatarGroupCount>
                ) : null}
              </AvatarGroup>
              <span className="text-sm text-neutral-500">
                {assignees.length} people
              </span>
            </div>
          )
        ) : (
          <span className="text-sm text-neutral-400">No one assigned yet</span>
        )}

        <button
          type="button"
          onClick={() => onEdit(role)}
          className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] transition-all hover:bg-primary/[0.05] hover:text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        >
          Edit Role
        </button>
      </div>
    </div>
  );
}
