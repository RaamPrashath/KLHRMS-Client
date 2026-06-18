'use client';

import { useState, useMemo } from 'react';
import { Search, MoreHorizontal, RotateCcw } from 'lucide-react';
import {
  Table,
  TableBody as ShadcnTableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { EmployeeListItem } from '@/modules/employees/types/employeeTypes';

interface DeactivatedEmployeeTableProps {
  data: EmployeeListItem[];
  isLoading: boolean;
  onReactivate: (memberId: string, employeeName: string) => void;
  isReactivating: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function DeactivatedEmployeeTable({
  data,
  isLoading,
  onReactivate,
  isReactivating,
}: Readonly<DeactivatedEmployeeTableProps>) {
  const [search, setSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ memberId: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((item) => {
      const haystack = [item.name, item.email, item.employee_id ?? '', item.department ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [data, search]);

  const handleConfirm = () => {
    if (confirmDialog) {
      onReactivate(confirmDialog.memberId, confirmDialog.name);
      setConfirmDialog(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 mx-7 mb-7">
        <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="px-8 py-6 border-b border-black/[0.04]">
            <div className="h-10 w-64 animate-pulse rounded-lg bg-neutral-100" />
          </div>
          <div className="flex min-h-[200px] items-center justify-center p-8">
            <p className="text-sm text-neutral-400">Loading deactivated employees...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 mx-7 mb-7">
      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
        <div className="px-8 py-6 flex flex-col gap-4 border-b border-black/[0.04]">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search deactivated employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        <div className="w-full">
          <Table className="table-fixed">
            <TableHeader className="bg-canvas/50">
              <TableRow className="border-black/[0.04] hover:bg-transparent">
                <TableHead className="w-[32%] h-auto py-3 pl-8 pr-3 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500 text-left">
                  Name
                </TableHead>
                <TableHead className="w-[30%] h-auto py-3 px-3 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500 text-left">
                  Email
                </TableHead>
                <TableHead className="w-[18%] h-auto py-3 px-3 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500 text-left">
                  Department
                </TableHead>
                <TableHead className="w-[12%] h-auto py-3 px-3 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500 text-left">
                  Designation
                </TableHead>
                <TableHead className="w-[8%] h-auto py-3 pr-8 pl-3 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500 text-left">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <ShadcnTableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-sm text-neutral-400">
                    No deactivated employees found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.member_id} className="border-black/[0.04]">
                    <TableCell className="pl-8 pr-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-8 shrink-0">
                          <AvatarImage src={item.image ?? undefined} alt={item.name} />
                          <AvatarFallback className="bg-primary-subtle text-xs font-medium text-primary">
                            {getInitials(item.name)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="truncate text-sm font-medium text-neutral-900">{item.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <p className="truncate text-sm text-neutral-600">{item.email}</p>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <p className="truncate text-sm text-neutral-600">{item.department ?? '-'}</p>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <p className="truncate text-sm text-neutral-600">{item.job_title ?? '-'}</p>
                    </TableCell>
                    <TableCell className="pr-8 pl-3 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0"
                            disabled={isReactivating}
                          >
                            <MoreHorizontal className="size-4 text-neutral-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setConfirmDialog({ memberId: item.member_id, name: item.name })}
                          >
                            <RotateCcw className="size-3.5 mr-2 text-blue-600" />
                            <span>Reactivate</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </ShadcnTableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={!!confirmDialog}
        onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Employee</DialogTitle>
            <DialogDescription>
              Reactivate <span className="font-medium text-foreground">{confirmDialog?.name}</span>?
              They will regain access to the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={isReactivating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleConfirm}
              disabled={isReactivating}
            >
              {isReactivating ? 'Reactivating...' : 'Confirm Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
