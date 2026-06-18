'use client';

import { useMemo, useState } from 'react';
import { Users, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ProjectSummary, ProjectStatus } from '@/modules/projects/types/projectTypes';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface ProjectsTableProps {
  data: ProjectSummary[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  statusFilter: ProjectStatus | 'ALL';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ProjectStatus | 'ALL') => void;
  onClearAll: () => void;
  onRowClick: (project: ProjectSummary) => void;
  orgSlug: string;
  memberId: string;
  canManage: boolean;
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-[#eef9f1] text-[#156f3d]',
  ON_HOLD: 'bg-[#fff7e8] text-[#8a5a00]',
  COMPLETED: 'bg-[#eef5ff] text-[#2454a6]',
  CANCELLED: 'bg-[#fff0f0] text-[#a12323]',
};

const PAGE_SIZE = 12;

function ProjectsSkeletonList({ pageSize }: { readonly pageSize: number }) {
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

export function ProjectsTable({
  data,
  isLoading,
  search,
  onSearchChange,
  onRowClick,
}: Readonly<ProjectsTableProps>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));

  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [data, page]);

  return (
    <div className="flex flex-col flex-1 mx-7 mb-7">
      {/* Search bar */}
      <div className="relative w-full md:w-1/2">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <Input
          placeholder="Search projects by name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white border border-black/10 focus:border-primary text-sm h-10 w-full rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
        />
      </div>

      <div className="w-full flex-1">
        {isLoading ? (
          <ProjectsSkeletonList pageSize={PAGE_SIZE} />
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400 mt-6 bg-white border border-black/5 rounded-lg">
            No projects found.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {paginatedData.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onRowClick(project)}
                  className="p-4 bg-white rounded-lg border border-black/5 hover:border-indigo-500 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-36"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base text-neutral-900 truncate text-left" title={project.name}>
                      {project.name}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 truncate text-left">
                      Client: <span className="font-medium text-neutral-700">{project.clientName || 'Internal'}</span>
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-4 border-t pt-2 border-black/5">
                    <span className="text-xs text-neutral-600 font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-neutral-400" />
                      {project.memberCount} {project.memberCount === 1 ? 'person' : 'people'}
                    </span>
                    <Badge className={cn('rounded-lg px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase', STATUS_STYLES[project.status])}>
                      {project.status.replaceAll('_', ' ').toLowerCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setPage(pageNum)}
                          isActive={page === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
