'use client';

import { useState, useMemo } from 'react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Search, ArrowUpDown, Filter } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { LeaveRequestRecord } from '@/modules/leave/types/leaveTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortOption = 'pending-first' | 'latest' | 'oldest';
type FilterOption = 'today' | 'this-week' | 'this-month' | 'all-time';
type LeavePermissionScope = 'none' | 'self' | 'department' | 'organization';

interface LeaveRequestsTableProps {
  requests: LeaveRequestRecord[];
  isLoading: boolean;
  onRowClick: (requestId: string) => void;
  viewScope?: LeavePermissionScope;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function statusTone(status: string) {
  if (status === 'APPROVED') return 'bg-success-bg text-success-text border-success-border';
  if (status === 'REJECTED') return 'bg-destructive-bg text-destructive-text border-destructive-border';
  if (status === 'CANCELLED') return 'bg-neutral-100 text-neutral-500 border-neutral-200';
  return 'bg-warning-bg text-warning-text border-warning-border';
}

function statusLabel(status: string) {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'CANCELLED') return 'Cancelled';
  return 'Pending';
}

function formatDateRange(startDate: string, endDate: string) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
    return format(start, 'MMM d, yyyy');
  }
  
  if (format(start, 'yyyy-MM') === format(end, 'yyyy-MM')) {
    return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
  }
  
  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeaveRequestsTable({ requests, isLoading, onRowClick, viewScope = 'organization' }: Readonly<LeaveRequestsTableProps>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [filterOption, setFilterOption] = useState<FilterOption>('all-time');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Determine if we should show the name column (hide for "self" scope)
  const showNameColumn = viewScope !== 'self';

  // Filter by date range
  const filteredByDate = useMemo(() => {
    if (filterOption === 'all-time') return requests;

    const now = new Date();
    let startRange: Date;
    let endRange: Date;

    switch (filterOption) {
      case 'today':
        startRange = startOfDay(now);
        endRange = endOfDay(now);
        break;
      case 'this-week':
        startRange = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        endRange = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'this-month':
        startRange = startOfMonth(now);
        endRange = endOfMonth(now);
        break;
      default:
        return requests;
    }

    return requests.filter((request) => {
      const requestStart = parseISO(request.startDate);
      const requestEnd = parseISO(request.endDate);
      
      // Check if request overlaps with the filter range
      return (
        isWithinInterval(requestStart, { start: startRange, end: endRange }) ||
        isWithinInterval(requestEnd, { start: startRange, end: endRange }) ||
        (requestStart <= startRange && requestEnd >= endRange)
      );
    });
  }, [requests, filterOption]);

  // Filter by search query
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return filteredByDate;

    const query = searchQuery.toLowerCase();
    return filteredByDate.filter((request) => {
      const memberName = request.member.name?.toLowerCase() || '';
      const memberEmail = request.member.email?.toLowerCase() || '';
      const leaveType = request.leaveType.name.toLowerCase();
      const status = request.status.toLowerCase();

      return (
        memberName.includes(query) ||
        memberEmail.includes(query) ||
        leaveType.includes(query) ||
        status.includes(query)
      );
    });
  }, [filteredByDate, searchQuery]);

  // Sort
  const sortedRequests = useMemo(() => {
    const sorted = [...filteredBySearch];

    switch (sortOption) {
      case 'pending-first':
        return sorted.sort((a, b) => {
          // Pending first, then by date (latest first)
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'latest':
      default:
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [filteredBySearch, sortOption]);

  // Pagination
  const totalPages = Math.ceil(sortedRequests.length / pageSize);
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRequests.slice(startIndex, startIndex + pageSize);
  }, [sortedRequests, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOption, filterOption]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search by name, email, or leave type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Date Filter */}
          <Select value={filterOption} onValueChange={(value) => setFilterOption(value as FilterOption)}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="size-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
            <SelectTrigger className="w-[160px] h-9">
              <ArrowUpDown className="size-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending-first">Pending First</SelectItem>
              <SelectItem value="latest">Latest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50/60 hover:bg-neutral-50/60">
              {showNameColumn && <TableHead className="font-semibold text-neutral-700">Name</TableHead>}
              <TableHead className="font-semibold text-neutral-700">Leave Type</TableHead>
              <TableHead className="font-semibold text-neutral-700">Start Date</TableHead>
              <TableHead className="font-semibold text-neutral-700">End Date</TableHead>
              <TableHead className="font-semibold text-neutral-700">Total Days</TableHead>
              <TableHead className="font-semibold text-neutral-700">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={showNameColumn ? 6 : 5} className="h-32 text-center text-sm text-neutral-500">
                  Loading leave requests...
                </TableCell>
              </TableRow>
            ) : paginatedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showNameColumn ? 6 : 5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm font-medium text-neutral-900">No leave requests found</p>
                    <p className="text-sm text-neutral-500">
                      {searchQuery || filterOption !== 'all-time'
                        ? 'Try adjusting your filters or search query'
                        : 'Leave requests will appear here once submitted'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((request) => (
                <TableRow
                  key={request.id}
                  onClick={() => onRowClick(request.id)}
                  className="cursor-pointer hover:bg-neutral-50 transition-colors"
                >
                  {showNameColumn && (
                    <TableCell className="font-medium text-neutral-900">
                      <div className="flex flex-col">
                        <span>{request.member.name || 'Unnamed'}</span>
                        <span className="text-xs text-neutral-500">{request.member.email}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-neutral-700">{request.leaveType.name}</TableCell>
                  <TableCell className="text-neutral-700">{format(parseISO(request.startDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-neutral-700">{format(parseISO(request.endDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-neutral-700 font-mono">{request.days}</TableCell>
                  <TableCell>
                    <Badge className={cn('rounded-full px-3 py-1 text-xs font-medium border', statusTone(request.status))}>
                      {statusLabel(request.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedRequests.length)} of {sortedRequests.length} requests
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={cn('min-w-9', currentPage === page && 'bg-primary text-white')}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
