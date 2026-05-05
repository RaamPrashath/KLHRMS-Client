'use client';

import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';
import { AttendanceFilters } from '@/modules/attendance/components/AttendanceFilters';
import { AttendanceRow } from '@/modules/attendance/components/AttendanceRow';
import { AttendanceEmptyState } from '@/modules/attendance/components/AttendanceEmptyState';
import {
  formatDate,
  formatTime,
  formatHours,
} from '@/modules/attendance/utils/attendanceFormatters';
import type {
  AttendanceRecord,
  AttendanceListResponse,
  AttendanceFiltersState,
} from '@/modules/attendance/types/attendanceTypes';

interface AttendanceTableProps {
  data: AttendanceListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  filters: AttendanceFiltersState;
  onFiltersChange: (f: AttendanceFiltersState) => void;
  canEdit: boolean;
  canDelete: boolean;
  /** Show employee name column — only for org-scope (manager) views */
  showEmployeeColumn: boolean;
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (record: AttendanceRecord) => void;
}

const columnHelper = createColumnHelper<AttendanceRecord>();

const SKELETON_IDS = Array.from({ length: 20 }, (_, i) => `skeleton-row-${i}`);

interface BodyProps {
  isLoading: boolean;
  items: AttendanceRecord[];
  pageSize: number;
  columnCount: number;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (record: AttendanceRecord) => void;
}

function TableBody({
  isLoading,
  items,
  pageSize,
  columnCount,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: Readonly<BodyProps>) {
  if (isLoading) {
    return (
      <>
        {SKELETON_IDS.slice(0, pageSize).map((id) => (
          <tr key={id} className="border-b border-neutral-100">
            {Array.from({ length: columnCount }, (_, j) => (
              <td key={j} className="px-4 py-2">
                <Skeleton className="h-4 w-full" />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  if (items.length === 0) {
    return (
      <tr>
        <td colSpan={columnCount}>
          <AttendanceEmptyState />
        </td>
      </tr>
    );
  }

  return (
    <>
      {items.map((record) => (
        <AttendanceRow
          key={record.id}
          record={record}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export function AttendanceTable(props: Readonly<AttendanceTableProps>) {
  const {
    data,
    isLoading,
    isError,
    onRetry,
    filters,
    onFiltersChange,
    canEdit,
    canDelete,
    showEmployeeColumn,
    onEdit,
    onDelete,
  } = props;

  const items = data?.items ?? [];
  const pageSize = filters.pageSize ?? 20;
  const currentPage = filters.page ?? 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  // Columns — no employee ID or UUID ever shown
  const columns = [
    columnHelper.accessor('date', {
      header: 'Date',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('clockIn', {
      header: 'Clock In',
      cell: (info) => formatTime(info.getValue()),
    }),
    columnHelper.accessor('clockOut', {
      header: 'Clock Out',
      cell: (info) => formatTime(info.getValue()),
    }),
    columnHelper.accessor('totalHours', {
      header: 'Total Hrs',
      cell: (info) => formatHours(info.getValue()),
    }),
    columnHelper.accessor('overtimeHours', {
      header: 'OT Hrs',
      cell: (info) => formatHours(info.getValue()),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => info.getValue(),
    }),
    ...(canEdit || canDelete
      ? [
          columnHelper.display({
            id: 'actions',
            header: 'Actions',
          }),
        ]
      : []),
  ];

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <div className="flex flex-col gap-4">
      <AttendanceFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        showMemberFilter={showEmployeeColumn}
      />

      <div className="bg-surface border border-neutral-100 rounded-xl shadow-(--shadow-1) overflow-hidden">
        {isError ? (
          <div className="p-6 flex flex-col items-center gap-3">
            <p className="text-sm text-destructive-text">Failed to load attendance records.</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-medium text-primary hover:text-primary-hover underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="bg-canvas text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-2.5 border-b border-neutral-200 text-left"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                <TableBody
                  isLoading={isLoading}
                  items={items}
                  pageSize={pageSize}
                  columnCount={columns.length}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isError && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-neutral-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, page: currentPage - 1 })}
              disabled={currentPage <= 1 || isLoading}
              className="text-xs font-medium px-3 py-1.5 rounded-md border border-neutral-200 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-100"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, page: currentPage + 1 })}
              disabled={currentPage >= totalPages || isLoading}
              className="text-xs font-medium px-3 py-1.5 rounded-md border border-neutral-200 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-100"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
