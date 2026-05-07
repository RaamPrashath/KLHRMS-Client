'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHolidaysAction } from '@/modules/leave/api/leaveServerActions';
import type { HolidayListResponse } from '@/modules/leave/types/leaveTypes';

export interface HolidayTableFilters {
  search: string;
  month: number; // 0 = all months
  year: number;
  page: number;
  pageSize: number;
}

const DEFAULT_FILTERS: HolidayTableFilters = {
  search: '',
  month: 0,
  year: new Date().getFullYear(),
  page: 1,
  pageSize: 20,
};

export function useHolidaysTable(orgSlug: string, memberId: string) {
  const [filters, setFilters] = useState<HolidayTableFilters>(DEFAULT_FILTERS);

  const query = useQuery<HolidayListResponse, Error>({
    queryKey: [
      'leave-holidays-table',
      orgSlug,
      filters.year,
      filters.month,
      filters.search,
      filters.page,
      filters.pageSize,
    ],
    queryFn: () =>
      fetchHolidaysAction({
        orgSlug,
        memberId,
        year: filters.year,
        month: filters.month > 0 ? filters.month : undefined,
        search: filters.search || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
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

  function setMonth(month: number) {
    setFilters((f) => ({ ...f, month, page: 1 }));
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
    setMonth,
    setYear,
  };
}
