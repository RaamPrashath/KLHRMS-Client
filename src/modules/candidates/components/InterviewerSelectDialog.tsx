'use client';

import { Search, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInterviewersSearch } from '@/modules/candidates/hooks/useAtsPipeline';
import type { StageWorkspaceInterviewer } from '@/modules/candidates/types/atsTypes';

interface InterviewerSelectDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly orgSlug: string;
  readonly memberId: string;
  readonly mode?: 'interviewer';
  readonly onSelect: (interviewer: StageWorkspaceInterviewer) => void;
  readonly excludedMemberIds: ReadonlySet<string>;
}

function initials(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function InterviewerSelectDialog({
  open,
  onOpenChange,
  orgSlug,
  memberId,
  onSelect,
  excludedMemberIds,
}: InterviewerSelectDialogProps) {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const interviewersQuery = useInterviewersSearch(orgSlug, memberId, search);
  const interviewers = interviewersQuery.data?.items ?? [];

  const departments = useMemo(() => {
    const depts = new Set<string>();
    for (const iv of interviewers) {
      if (iv.department) depts.add(iv.department);
    }
    return ['all', ...Array.from(depts).sort()];
  }, [interviewers]);

  const filtered = useMemo(
    () => interviewers
      .filter((iv) => !excludedMemberIds.has(iv.memberId))
      .filter((iv) => departmentFilter === 'all' || iv.department === departmentFilter),
    [departmentFilter, interviewers, excludedMemberIds],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Add Interviewer
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search + Department filter — inline */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name..."
                className="h-10 pl-9"
                autoFocus
              />
            </div>
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.filter((d) => d !== 'all').map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="max-h-72 overflow-y-auto rounded-lg border border-neutral-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Department
                  </TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviewersQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
                        <Loader2 className="size-4 animate-spin" />
                        Searching...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center text-sm text-neutral-500">
                      No employees found{search ? ' matching your search' : ''}.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((interviewer) => (
                    <TableRow
                      key={interviewer.memberId}
                      className="group transition-colors hover:bg-neutral-50"
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 shrink-0">
                            <AvatarFallback className="bg-primary-ghost text-xs font-semibold text-primary">
                              {initials(interviewer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-900">
                              {interviewer.name}
                            </p>
                            <p className="truncate text-xs text-neutral-500">
                              {interviewer.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-neutral-600">
                          {interviewer.department ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => {
                            onSelect(interviewer);
                            onOpenChange(false);
                            setSearch('');
                            setDepartmentFilter('all');
                          }}
                        >
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
