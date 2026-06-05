'use client';

import { Users2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import type { EmployeeGroupBrief } from '@/modules/employees/types/employeeDetailTypes';

interface EmployeeGroupMembershipsProps {
  groups: EmployeeGroupBrief[];
}

export function EmployeeGroupMemberships({
  groups,
}: Readonly<EmployeeGroupMembershipsProps>) {
  return (
    <Card className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users2 className="size-4 text-neutral-500" />
          Microsoft 365 group memberships
        </CardTitle>
        <CardDescription>
          Synced from Microsoft Entra (if sync is enabled)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <Empty className="border-neutral-200 bg-canvas/30 py-10">
            <EmptyTitle>No group memberships</EmptyTitle>
            <EmptyDescription>
              This employee is not a member of any Microsoft 365 groups yet.
            </EmptyDescription>
          </Empty>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Badge variant="secondary" className="px-3 py-1.5">
                  {g.display_name}
                  {g.group_type ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-neutral-500">
                      {g.group_type}
                    </span>
                  ) : null}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
