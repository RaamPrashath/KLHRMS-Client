'use client';

import { type RoleResponse } from '@/modules/roles/types/role';
import { RoleCard } from '@/modules/roles/components/RoleCard';

interface RoleAssignee {
  memberId: string;
  name: string;
  image: string | null;
}

export interface RolesGridProps {
  roles: RoleResponse[];
  peopleByRoleId?: Record<string, RoleAssignee[]>;
  onEdit: (role: RoleResponse) => void;
  onDelete: (role: RoleResponse) => void;
}

export function RolesGrid({
  roles,
  peopleByRoleId = {},
  onEdit,
  onDelete,
}: Readonly<RolesGridProps>) {
  return (
    <div className="bg-white border border-black/[0.03] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl flex flex-col overflow-hidden">
      {roles.map((role) => (
        <div key={role.id} className="border-b border-black/[0.04] last:border-b-0">
          <RoleCard
            role={role}
            assignees={peopleByRoleId[role.id] ?? []}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}
