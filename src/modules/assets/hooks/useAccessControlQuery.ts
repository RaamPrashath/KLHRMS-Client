'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createAccessAssignmentAction,
  createAccessLogAction,
  fetchAccessAssignmentsAction,
  fetchAccessLogsAction,
  fetchAccessLogSummaryAction,
  updateAccessAssignmentAction,
  updateAccessLogAction,
} from '@/modules/assets/api/accessControlServerActions';
import { readError } from '@/modules/assets/lib/assetUtils';
import type {
  AccessControlAssignmentItem,
  AccessControlAssignmentListResponse,
  AccessControlLogItem,
  AccessControlLogListResponse,
  AccessControlLogSummary,
} from '@/modules/assets/types/accessControlTypes';

interface LogFilters {
  page: number;
  pageSize: number;
  employeeMemberId?: string;
  accessPoint?: string;
  status?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAccessLogsQuery(
  orgSlug: string,
  memberId: string,
  filters: LogFilters,
) {
  return useQuery<AccessControlLogListResponse, Error>({
    queryKey: ['access-logs', orgSlug, filters],
    queryFn: () => fetchAccessLogsAction({ orgSlug, memberId, ...filters }),
    enabled: !!orgSlug && !!memberId,
    placeholderData: (previous) => previous,
  });
}

export function useAccessLogSummaryQuery(orgSlug: string, memberId: string) {
  return useQuery<AccessControlLogSummary, Error>({
    queryKey: ['access-log-summary', orgSlug],
    queryFn: () => fetchAccessLogSummaryAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60,
  });
}

interface AssignmentFilters {
  page: number;
  pageSize: number;
  employeeMemberId?: string;
  accessPoint?: string;
  status?: string;
}

export function useAccessAssignmentsQuery(
  orgSlug: string,
  memberId: string,
  filters: AssignmentFilters,
) {
  return useQuery<AccessControlAssignmentListResponse, Error>({
    queryKey: ['access-assignments', orgSlug, filters],
    queryFn: () => fetchAccessAssignmentsAction({ orgSlug, memberId, ...filters }),
    enabled: !!orgSlug && !!memberId,
    placeholderData: (previous) => previous,
  });
}

export function useAccessControlMutations(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const toggleAssignment = useMutation({
    mutationFn: (params: {
      assignmentId: string;
      status: string;
    }) => updateAccessAssignmentAction({
      orgSlug,
      memberId,
      assignmentId: params.assignmentId,
      data: { status: params.status },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-assignments', orgSlug] });
    },
    onError: (error: Error) => {
      toast.error(readError(error, 'Failed to update assignment'));
    },
  });

  const createAssignment = useMutation({
    mutationFn: (data: { employeeMemberId: string; accessPoint: string; status?: string }) =>
      createAccessAssignmentAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-assignments', orgSlug] });
      toast.success('Access assignment created');
    },
    onError: (error: Error) => {
      toast.error(readError(error, 'Failed to create assignment'));
    },
  });

  const createLog = useMutation({
    mutationFn: (data: {
      employeeMemberId: string;
      assetId?: string | null;
      accessPoint: string;
      entryMethod: string;
      status: string;
      direction: string;
      enteredAt: string;
      isActive?: boolean;
      notes?: string | null;
    }) => createAccessLogAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-logs', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['access-log-summary', orgSlug] });
      toast.success('Access log created');
    },
    onError: (error: Error) => {
      toast.error(readError(error, 'Failed to create log'));
    },
  });

  return { toggleAssignment, createAssignment, createLog };
}
