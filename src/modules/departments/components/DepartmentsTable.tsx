'use client';

import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DepartmentsFilters } from './DepartmentsFilters';
import { DepartmentsPagination } from './DepartmentsPagination';
import type {
  DepartmentSummary,
  DepartmentStatus,
} from '@/modules/departments/types/departmentTypes';

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

const STATUS_STYLES: Record<DepartmentStatus, string> = {
  ACTIVE: 'bg-[#eef9f1] text-[#156f3d]',
  INACTIVE: 'bg-[#fff0f0] text-[#a12323]',
};

function DepartmentsSkeletonList({ pageSize }: { readonly pageSize: number }) {
  const count = pageSize || 8;
  const skeletonIds = Array.from({ length: count }, (_, i) => `skeleton-card-${i}`);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
      {skeletonIds.map((id) => (
        <div key={id} className="p-4 bg-white rounded-lg border border-black/5 h-36 flex flex-col justify-between animate-pulse">
          <div>
            <div className="h-5 w-2/3 bg-neutral-200 rounded" />
            <div className="h-3 w-1/2 bg-neutral-100 rounded mt-2" />
          </div>
          <div className="flex justify-between items-center mt-4 border-t pt-2 border-black/5">
            <div className="h-4 w-1/3 bg-neutral-200 rounded" />
            <div className="h-5 w-1/4 bg-neutral-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
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
  return (
    <div className="flex flex-col flex-1 mx-7 mb-7">
      {/* Filters directly on page canvas */}
      <div className="flex flex-col gap-2">
        <DepartmentsFilters
          search={search}
          onSearchChange={onSearchChange}
          onClearAll={onClearAll}
        />
      </div>

      {/* Grid directly on page canvas */}
      <div className="w-full flex-1 mt-6">
        {isLoading ? (
          <DepartmentsSkeletonList pageSize={pageSize} />
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400 bg-white border border-black/5 rounded-lg">
            No Departments Found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.map((dept) => (
              <div
                key={dept.id}
                onClick={() => onRowClick(dept)}
                className="p-4 bg-white rounded-lg border border-black/5 hover:border-indigo-500 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-36"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-neutral-900 truncate text-left" title={dept.name}>
                    {dept.name}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 truncate text-left">
                    Lead: <span className="font-medium text-neutral-700">{dept.headMemberName || 'None'}</span>
                  </p>
                </div>
                <div className="flex justify-between items-center mt-4 border-t pt-2 border-black/5">
                  <span className="text-xs text-neutral-600 font-medium flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    {dept.memberCount} {dept.memberCount === 1 ? 'person' : 'people'}
                  </span>
                  <Badge className={cn('rounded-lg px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase shadow-none border-0', STATUS_STYLES[dept.status])}>
                    {dept.status.toLowerCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination pushed to the bottom of the page */}
      {!isLoading && total > 0 && (
        <div className="mt-auto pt-6 flex justify-center">
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
  );
}
