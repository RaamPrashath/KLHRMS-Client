'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLeaveBalancesAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveBalanceListResponse } from '@/modules/leave/types/leaveTypes';

export interface LeaveBalanceTableFilters {
  search: string;
  year: number;
  page: number;
  pageSize: number;
}

const DEFAULT_FILTERS: LeaveBalanceTableFilters = {
  search: '',
  year: new Date().getFullYear(),
  page: 1,
  pageSize: 25,
};

export function useLeaveBalancesTable(orgSlug: string, memberId: string) {
  const [filters, setFilters] = useState<LeaveBalanceTableFilters>(DEFAULT_FILTERS);

  const query = useQuery<LeaveBalanceListResponse, Error>({
    queryKey: [
      'leave-balances-table',
      orgSlug,
      filters.year,
      filters.search,
      filters.page,
      filters.pageSize,
    ],
    queryFn: () =>
      fetchLeaveBalancesAction({
        orgSlug,
        memberId,
        filters: {
          year: filters.year,
          search: filters.search || undefined,
          page: filters.page,
          pageSize: filters.pageSize,
        },
      }),
    enabled: !!orgSlug && !!memberId,
    placeholderData: (prev) => prev,
  });

  const totalPages = query.data
    ? Math.max(1, Math.ceil(query.data.total / filters.pageSize))
    : 1;

  function setPage(page: number) {
    setFilters((f) => ({ ...f, page }));
  }

  function setPageSize(pageSize: number) {
    setFilters((f) => ({ ...f, pageSize, page: 1 }));
  }

  function setSearch(search: string) {
    setFilters((f) => ({ ...f, search, page: 1 }));
  }

  function setYear(year: number) {
    setFilters((f) => ({ ...f, year, page: 1 }));
  }

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    filters,
    totalPages,
    setPage,
    setPageSize,
    setSearch,
    setYear,
  };
}
