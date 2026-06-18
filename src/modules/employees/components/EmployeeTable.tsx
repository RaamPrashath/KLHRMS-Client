'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ChevronRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody as ShadcnTableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { EmployeeFilters } from './EmployeeFilters';
import { EmployeePagination } from './EmployeePagination';
import type {
  EmployeeListItem,
  EmployeeFilterOption,
} from '@/modules/employees/types/employeeTypes';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmployeeTableProps {
  // data
  data: EmployeeListItem[];
  isLoading: boolean;
  total: number;
  // pagination
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // filters
  search: string;
  roleId: string | undefined;
  source: string | undefined;
  roles: EmployeeFilterOption[];
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onRoleChange: (value: string | undefined) => void;
  onSourceChange: (value: string | undefined) => void;
  onClearAll: () => void;
  // role editing (inline)
  canEditRole?: boolean;
  onUpdateRole?: (memberId: string, roleId: string) => Promise<void>;
  // navigation
  orgSlug?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function colWidth(id: string): string {
  const map: Record<string, string> = {
    employee: 'w-[28%]',
    email: 'w-[26%]',
    role: 'w-[18%]',
    source: 'w-[12%]',
    details: 'w-[8%]',
  };
  return map[id] ?? 'w-[120px]';
}

function colAlign(id: string): string {
  if (id === 'source' || id === 'details') return 'justify-center';
  return 'justify-start';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Column definitions ───────────────────────────────────────────────────────

const SKELETON_COUNT = 20;
const SKELETON_IDS = Array.from({ length: SKELETON_COUNT }, (_, i) => `skeleton-row-${i}`);

function buildColumns(
  canEditRole: boolean,
  roles: EmployeeFilterOption[],
  orgSlug: string | undefined,
  onUpdateRole?: (memberId: string, roleId: string) => Promise<void>,
): ColumnDef<EmployeeListItem>[] {
  const cols: ColumnDef<EmployeeListItem>[] = [
    {
      id: 'employee',
      header: 'Name',
      cell: ({ row }) => {
        const { name, image, job_title, department } = row.original;
        const subtitle = [job_title, department].filter(Boolean).join(' · ');
        const content = (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={image ?? undefined} alt={name} />
              <AvatarFallback className="bg-primary-subtle text-xs font-medium text-primary">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900" title={name}>
                {name}
              </p>
              {subtitle ? (
                <p className="truncate text-xs text-neutral-500" title={subtitle}>
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        );
        return content;
      },
    },
    {
      id: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="block truncate text-sm text-neutral-700" title={row.original.email}>
            {row.original.email}
          </span>
          {row.original.user_principal_name &&
          row.original.user_principal_name !== row.original.email ? (
            <span
              className="block truncate text-xs text-neutral-500"
              title={row.original.user_principal_name}
            >
              {row.original.user_principal_name}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <div
          className="flex items-center gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.role ? (
            <span className="truncate text-sm text-neutral-700" title={row.original.role.name}>
              {row.original.role.name}
            </span>
          ) : (
            <span className="text-neutral-400">—</span>
          )}
          {canEditRole && onUpdateRole && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Select
                    value={row.original.role?.id ?? ''}
                    onValueChange={(value) => onUpdateRole(row.original.member_id, value)}
                  >
                    <SelectTrigger className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors border-0 bg-transparent shadow-none h-fit w-fit pr-0 pl-0 focus:ring-0 focus-visible:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 [&>svg:last-child]:hidden">
                      <Pencil className="size-3.5" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Change role
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      id: 'source',
      header: 'Source',
      cell: ({ row }) => (
        row.original.microsoft_synced ? (
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-50 text-blue-700 w-[90px] h-[24px] text-[11px] font-semibold select-none">
            <svg className="size-3 shrink-0" viewBox="0 0 21 21" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Microsoft
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 w-[90px] h-[24px] text-[11px] font-semibold select-none">
            Credentials
          </span>
        )
      ),
    },
    {
      id: 'details',
      header: '',
      cell: () => (
        <span className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white p-1 text-neutral-400 transition-colors group-hover/employee-row:border-neutral-300 group-hover/employee-row:text-neutral-700">
          <ChevronRight className="size-4" />
        </span>
      ),
    },
  ];

  return cols;
}

interface EmployeeTableBodyProps {
  isLoading: boolean;
  rows: Row<EmployeeListItem>[];
  pageSize: number;
  columnCount: number;
  clickableRows: boolean;
  onRowClick: (memberId: string) => void;
}

function EmployeeTableBody({
  isLoading,
  rows,
  pageSize,
  columnCount,
  clickableRows,
  onRowClick,
}: Readonly<EmployeeTableBodyProps>) {
  if (isLoading) {
    return (
      <ShadcnTableBody className="bg-surface">
        {SKELETON_IDS.slice(0, pageSize).map((id) => (
          <TableRow key={id} className="border-black/4 hover:bg-transparent">
            <TableCell colSpan={columnCount} className="p-6">
              <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
            </TableCell>
          </TableRow>
        ))}
      </ShadcnTableBody>
    );
  }

  if (rows.length === 0) {
    return (
      <ShadcnTableBody className="bg-surface">
        <TableRow className="border-black/4 hover:bg-transparent">
          <TableCell colSpan={columnCount} className="py-16 text-center text-sm text-neutral-400">
            No employees found.
          </TableCell>
        </TableRow>
      </ShadcnTableBody>
    );
  }

  return (
    <ShadcnTableBody className="bg-surface">
      {rows.map((row) => (
        <TableRow
          key={row.id}
          className={cn(
            'group/employee-row border-black/4 transition-colors',
            clickableRows && 'cursor-pointer hover:bg-black/[0.02]',
          )}
          onClick={() => {
            if (clickableRows) onRowClick(row.original.member_id);
          }}
        >
          {row.getVisibleCells().map((cell, index) => {
            const isFirst = index === 0;
            const isLast = index === row.getVisibleCells().length - 1;
            return (
              <TableCell
                key={cell.id}
                className={cn(
                  colWidth(cell.column.id),
                  'py-3 whitespace-nowrap',
                  isFirst ? 'pl-8 pr-3' : isLast ? 'pr-8 pl-3' : 'px-3',
                  colAlign(cell.column.id) === 'justify-end' ? 'text-right' : colAlign(cell.column.id) === 'justify-center' ? 'text-center' : 'text-left',
                )}
              >
                <div className={cn('flex', colAlign(cell.column.id))}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </ShadcnTableBody>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EmployeeTable({
  data,
  isLoading,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  search,
  roleId,
  source,
  roles,
  onSearchChange,
  onClearSearch,
  onRoleChange,
  onSourceChange,
  onClearAll,
  canEditRole = false,
  onUpdateRole,
  orgSlug,
}: Readonly<EmployeeTableProps>) {
  const router = useRouter();
  const columns = useMemo(
    () => buildColumns(canEditRole, roles, orgSlug, onUpdateRole),
    [canEditRole, roles, orgSlug, onUpdateRole],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const columnCount = table.getAllLeafColumns().length;
  const clickableRows = !!orgSlug;

  return (
    <TooltipProvider>
      <div className="flex flex-col flex-1 mx-7 mb-7">
        <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
          {/* ── Layer 1: Top actions (filters) ──────────────────────────── */}
          <div className="px-8 py-6 flex flex-col gap-4 border-b border-black/[0.04]">
            <div className="flex items-start justify-between gap-4">
              <EmployeeFilters
                search={search}
                roleId={roleId}
                source={source}
                roles={roles}
                onSearchChange={onSearchChange}
                onClearSearch={onClearSearch}
                onRoleChange={onRoleChange}
                onSourceChange={onSourceChange}
                onClearAll={onClearAll}
              />
            </div>
            <EmployeeFilters
              search={search}
              roleId={roleId}
              roles={roles}
              onSearchChange={onSearchChange}
              onClearSearch={onClearSearch}
              onRoleChange={onRoleChange}
              onClearAll={onClearAll}
            />
          </div>

          {/* ── Layer 2 & 3: Table (Flex) ─────────────────────────────────────────── */}
          <div className="w-full">
            <Table className="table-fixed">
              <TableHeader className="bg-canvas/50">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-black/[0.04] hover:bg-transparent">
                    {hg.headers.map((header, index) => {
                      const isFirst = index === 0;
                      const isLast = index === hg.headers.length - 1;
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            colWidth(header.id),
                            'h-auto py-3 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500',
                            isFirst ? 'pl-8 pr-3' : isLast ? 'pr-8 pl-3' : 'px-3',
                            colAlign(header.id) === 'justify-end' ? 'text-right' : colAlign(header.id) === 'justify-center' ? 'text-center' : 'text-left',
                          )}
                        >
                          {header.isPlaceholder
                            ? ''
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>

              <EmployeeTableBody
                isLoading={isLoading}
                rows={table.getRowModel().rows}
                pageSize={pageSize}
                columnCount={columnCount}
                clickableRows={clickableRows}
                onRowClick={(memberId) => {
                  if (!orgSlug) return;
                  router.push(`/${orgSlug}/employees/${memberId}`);
                }}
              />
            </Table>
          </div>

          {/* ── Pagination (below body) ────────────────────────── */}
          {!isLoading && total > 0 && (
            <div className="px-8 py-6 mt-auto border-t border-black/[0.04] bg-surface">
              <EmployeePagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
