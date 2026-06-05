'use client';

import { ArrowDown, ArrowUp, Network } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {
  EmployeeManagerChainEntry,
  EmployeePersonBrief,
} from '@/modules/employees/types/employeeDetailTypes';

interface EmployeeOrgChartProps {
  orgSlug: string;
  currentName: string;
  manager: EmployeePersonBrief | null;
  managerChain: EmployeeManagerChainEntry[];
  directReports: EmployeePersonBrief[];
}

type PersonLike = {
  name: string;
  job_title: string | null;
  department: string | null;
  image: string | null;
  member_id: string | null;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function toPerson(p: EmployeePersonBrief | EmployeeManagerChainEntry): PersonLike {
  if ('display_name' in p) {
    return {
      name: p.display_name || '',
      job_title: p.job_title ?? null,
      department: p.department ?? null,
      image: null,
      member_id: p.member_id ?? null,
    };
  }
  return {
    name: p.name || '',
    job_title: p.job_title ?? null,
    department: p.department ?? null,
    image: p.image ?? null,
    member_id: p.member_id ?? null,
  };
}

function PersonRow({
  person,
  orgSlug,
}: Readonly<{
  person: PersonLike;
  orgSlug: string;
}>) {
  const Inner = (
    <div className="flex items-center gap-3 rounded-xl border border-black/[0.04] p-3 transition-colors hover:bg-black/[0.02]">
      <Avatar className="size-9">
        <AvatarImage
          src={person.image ?? undefined}
          alt={person.name}
        />
        <AvatarFallback className="bg-primary-subtle text-sm font-medium text-primary">
          {getInitials(person.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-neutral-900">
          {person.name}
        </span>
        <span className="truncate text-xs text-neutral-500">
          {person.job_title ?? 'No job title'}
          {person.department ? ` · ${person.department}` : ''}
        </span>
      </div>
    </div>
  );
  if (!person.member_id) {
    return Inner;
  }
  return (
    <Link
      href={`/${orgSlug}/employees/${person.member_id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
    >
      {Inner}
    </Link>
  );
}

export function EmployeeOrgChart({
  orgSlug,
  currentName,
  manager: _manager,
  managerChain,
  directReports,
}: Readonly<EmployeeOrgChartProps>) {
  // Display the chain from top → direct manager (top-of-chain) → current
  // `managerChain` is already ordered from direct manager upward.
  const chainDescending = [...managerChain].map(toPerson).reverse();

  return (
    <Card className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Network className="size-4 text-neutral-500" />
          Organization chart
        </CardTitle>
        <CardDescription>
          Reporting line above and people managed below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Upward chain */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <ArrowUp className="size-3.5" />
              Reports up to
            </div>
            {chainDescending.length === 0 ? (
              <p className="text-sm text-neutral-400">
                No reporting line on file
              </p>
            ) : (
              <ol className="flex flex-col gap-2">
                {chainDescending.map((person, idx) => (
                  <li key={`${person.member_id ?? person.name}-${idx}`} className="flex flex-col">
                    <PersonRow person={person} orgSlug={orgSlug} />
                    {idx < chainDescending.length - 1 ? (
                      <div className="ml-[1.4rem] h-3 w-px bg-neutral-200" />
                    ) : null}
                  </li>
                ))}
                {/* Current person as anchor */}
                <li className="flex flex-col">
                  <div className="ml-[1.4rem] h-3 w-px bg-neutral-200" />
                  <div className="rounded-xl border border-primary/20 bg-primary-subtle/40 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary text-sm font-medium text-white">
                          {getInitials(currentName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold text-neutral-900">
                          {currentName}
                        </span>
                        <span className="text-[11px] uppercase tracking-wider text-primary">
                          This employee
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              </ol>
            )}
          </div>

          {/* Direct reports */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <ArrowDown className="size-3.5" />
              Direct reports ({directReports.length})
            </div>
            {directReports.length === 0 ? (
              <p className="text-sm text-neutral-400">
                This employee has no direct reports
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {directReports.map((report) => (
                  <li key={report.member_id ?? report.microsoft_id ?? report.name}>
                    <PersonRow person={toPerson(report)} orgSlug={orgSlug} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
