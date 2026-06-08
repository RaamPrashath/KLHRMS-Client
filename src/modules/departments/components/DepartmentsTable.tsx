'use client';

import { ChevronRight } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody as ShadcnTableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getHrmsApiUrl } from '@/lib/deployment-env';
import { DepartmentsFilters } from './DepartmentsFilters';
import { DepartmentsPagination } from './DepartmentsPagination';
import type {
  DepartmentHeadSummary,
  DepartmentMemberSummary,
  DepartmentSummary,
} from '@/modules/departments/types/departmentTypes';

function toAbsoluteApiUrl(url?: string | null): string | null {
  if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url ?? null;
  }
  return `${getHrmsApiUrl().replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

interface DepartmentsTableProps {
  data: DepartmentSummary[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onClearAll: () => void;
  onRowClick: (department: DepartmentSummary) => void;
}

const SKELETON_COUNT = 20;
const SKELETON_IDS = Array.from({ length: SKELETON_COUNT }, (_, i) => `skeleton-row-${i}`);
const MAX_AVATAR_VISIBLE = 3;

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function colWidth(id: string): string {
  const map: Record<string, string> = {
    department: 'w-[34%]',
    lead: 'w-[32%]',
    people: 'w-[24%]',
    actions: 'w-[10%]',
  };
  return map[id] ?? 'w-[10%]';
}

function colAlign(id: string): string {
  return id === 'department' || id === 'lead' ? 'justify-start' : 'justify-center';
}

function colCellPadding(id: string): string {
  if (id === 'department') return 'pl-6 pr-3';
  if (id === 'people') return 'px-3';
  if (id === 'actions') return 'pr-6 pl-3';
  return 'px-3';
}

function colHeadPadding(id: string): string {
  if (id === 'department') return 'pl-6 pr-3';
  if (id === 'actions') return 'pr-6 pl-3';
  return 'px-3';
}

interface PersonAvatarItem {
  id: string;
  name: string | null;
  image?: string | null;
}

function PersonAvatars({ people }: Readonly<{ people: PersonAvatarItem[] }>) {
  if (people.length === 0) {
    return <span className="text-sm text-neutral-400">Not Assigned</span>;
  }

  if (people.length === 1) {
    return (
      <div className="flex items-center gap-2.5">
        <Avatar size="default">
          <AvatarImage src={toAbsoluteApiUrl(people[0].image) ?? undefined} alt={people[0].name ?? ''} />
          <AvatarFallback className="bg-primary-subtle text-xs font-medium text-primary">
            {getInitials(people[0].name)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-sm text-neutral-700">{people[0].name || 'Unassigned'}</span>
      </div>
    );
  }

  const visible = people.slice(0, MAX_AVATAR_VISIBLE);
  const overflow = people.length - visible.length;

  return (
    <div className="flex items-center gap-2.5">
      <AvatarGroup>
        {visible.map((person) => (
          <Avatar key={person.id} size="default">
            <AvatarImage src={toAbsoluteApiUrl(person.image) ?? undefined} alt={person.name ?? ''} />
            <AvatarFallback className="bg-primary-subtle text-xs font-medium text-primary">
              {getInitials(person.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {overflow > 0 && (
          <AvatarGroupCount className="bg-neutral-50 text-xs font-medium text-neutral-500">
            +{overflow}
          </AvatarGroupCount>
        )}
      </AvatarGroup>
      <span className="truncate text-sm text-neutral-500">
        {people.length} {people.length === 1 ? 'person' : 'people'}
      </span>
    </div>
  );
}

const columns: ColumnDef<DepartmentSummary>[] = [
  {
    id: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="block truncate text-sm font-medium text-neutral-900" title={row.original.name}>
        {row.original.name}
      </span>
    ),
  },
  {
    id: 'lead',
    header: 'Leads',
    cell: ({ row }) => {
      const heads: DepartmentHeadSummary[] = row.original.heads ?? [];
      const items: PersonAvatarItem[] =
        heads.length > 0
          ? heads.map((h) => ({ id: h.id, name: h.name, image: h.image }))
          : row.original.headMemberName
            ? [{ id: row.original.headMemberId ?? 'lead', name: row.original.headMemberName, image: null }]
            : [];
      return <PersonAvatars people={items} />;
    },
  },
  {
    id: 'people',
    header: 'Members',
    cell: ({ row }) => {
      const members: DepartmentMemberSummary[] = row.original.members ?? [];
      const items: PersonAvatarItem[] = members.map((m) => ({
        id: m.id,
        name: m.name,
        image: m.image,
      }));
      return <PersonAvatars people={items} />;
    },
  },
];

interface DepartmentsTableBodyProps {
  isLoading: boolean;
  rows: Row<DepartmentSummary>[];
  pageSize: number;
  columnCount: number;
  onRowClick: (department: DepartmentSummary) => void;
}

function DepartmentsTableBody({
  isLoading,
  rows,
  pageSize,
  columnCount,
  onRowClick,
}: Readonly<DepartmentsTableBodyProps>) {
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
            No Departments Found.
          </TableCell>
        </TableRow>
      </ShadcnTableBody>
    );
  }

  return (
    <ShadcnTableBody className="bg-surface">
      {rows.map((row) => {
        const dept = row.original;
        return (
          <TableRow
            key={row.id}
            onClick={() => onRowClick(dept)}
            className="cursor-pointer border-black/4 transition-colors hover:bg-black/[0.02]"
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn(
                  colWidth(cell.column.id),
                  colCellPadding(cell.column.id),
                  'py-3 whitespace-nowrap',
                  cell.column.id === 'department' || cell.column.id === 'lead' ? 'text-left' : 'text-center',
                )}
              >
                <div className={cn('flex', colAlign(cell.column.id))}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              </TableCell>
            ))}

            <TableCell className="w-[6%] py-3 pr-6 pl-3 text-right">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRowClick(dept);
                  }}
                  className="h-9 rounded-lg px-3 text-neutral-700 hover:bg-black/5"
                >
                  <ChevronRight className="size-4 opacity-50" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </ShadcnTableBody>
  );
}

export function DepartmentsTable({
  data,
  isLoading,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  onClearAll,
  onRowClick,
}: Readonly<DepartmentsTableProps>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const columnCount = table.getAllLeafColumns().length + 1;

  return (
    <div className="flex flex-col flex-1 mx-7 mb-7">
      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
        <div className="flex flex-col gap-2 border-b border-black/[0.04] px-3.5 py-3.5">
          <DepartmentsFilters
            search={search}
            onSearchChange={onSearchChange}
            onClearAll={onClearAll}
          />
        </div>

        <div className="w-full">
          <div>
            <Table className="table-fixed">
              <TableHeader className="bg-canvas/50">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-black/[0.04] hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          colWidth(header.id),
                          colHeadPadding(header.id),
                          'h-auto py-3 whitespace-nowrap text-[12.5px] font-semibold tracking-wider text-neutral-500',
                          header.id === 'department' || header.id === 'lead' ? 'text-left' : 'text-center',
                        )}
                      >
                        {header.isPlaceholder
                          ? ''
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                    <TableHead className="w-[8%] py-3 pr-6 pl-3" />
                  </TableRow>
                ))}
              </TableHeader>

              <DepartmentsTableBody
                isLoading={isLoading}
                rows={table.getRowModel().rows}
                pageSize={pageSize}
                columnCount={columnCount}
                onRowClick={onRowClick}
              />
            </Table>
          </div>
        </div>

        {!isLoading && total > 0 && (
          <div className="px-8 py-6 mt-auto border-t border-black/[0.04] bg-surface">
            <DepartmentsPagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
