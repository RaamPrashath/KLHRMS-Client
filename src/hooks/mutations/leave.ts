"use client";

/**
 * leave — Layer 2b mutation hooks.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiClient } from "@/hooks/useApiClient";
import {
  submitLeaveRequest,
  cancelLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  allocateBalance,
  autoAllocateBalances,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "@/hooks/functions/leave";
import type {
  LeaveRequestCreateInput,
  LeaveTypeCreateInput,
  LeaveTypeUpdateInput,
  BalanceAllocateInput,
  AutoAllocateInput,
  HolidayCreateInput,
  HolidayUpdateInput,
  ApproveInput,
  RejectInput,
} from "@/hooks/functions/leave";
import {
  LEAVE_TYPES_KEY,
  LEAVE_ALL_TYPES_KEY,
  LEAVE_REQUESTS_KEY,
  LEAVE_BALANCES_KEY,
  HOLIDAYS_KEY,
} from "@/hooks/queries/leave";

// ── Leave Request Mutations ───────────────────────────────────────────────────

export function useSubmitLeaveRequestMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: LeaveRequestCreateInput) =>
      submitLeaveRequest(auth!.token, auth!.orgId, body),
    onSuccess: () => {
      toast.success("Leave request submitted successfully");
      queryClient.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY(orgSlug) });
      queryClient.invalidateQueries({ queryKey: LEAVE_BALANCES_KEY(orgSlug) });
      // Invalidate all calendar queries for this org (date range varies per view)
      queryClient.invalidateQueries({ queryKey: ["leaves", "calendar", orgSlug] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to submit request";
      toast.error(message);
    },
  });
}

export function useCancelLeaveRequestMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      cancelLeaveRequest(auth!.token, auth!.orgId, requestId),
    onSuccess: () => {
      toast.success("Leave request cancelled");
      queryClient.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY(orgSlug) });
      queryClient.invalidateQueries({ queryKey: LEAVE_BALANCES_KEY(orgSlug) });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to cancel request";
      toast.error(message);
    },
  });
}

export function useApproveLeaveRequestMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, body }: { requestId: string; body?: ApproveInput }) => {
      if (!auth) throw new Error("Not authenticated");
      // Sanitize: strip undefined keys so FastAPI never sees { comment: undefined }
      const safeBody: ApproveInput =
        body?.comment != null ? { comment: body.comment } : {};
      return approveLeaveRequest(auth.token, auth.orgId, requestId, safeBody);
    },
    onSuccess: () => {
      toast.success("Leave request approved");
      queryClient.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY(orgSlug) });
      queryClient.invalidateQueries({ queryKey: LEAVE_BALANCES_KEY(orgSlug) });
      queryClient.invalidateQueries({ queryKey: ["leaves", "calendar", orgSlug] });
    },
    onError: (error: unknown) => {
      const raw =
        error instanceof Error ? error.message : "Failed to approve request";
      // Map backend business rule messages to friendlier copy
      const message =
        raw.toLowerCase().includes("no leave balance found")
          ? "This employee has no leave balance allocated for this leave type. Allocate a balance in the Balances tab first."
          : raw.toLowerCase().includes("insufficient leave balance")
          ? "This employee does not have enough remaining leave balance to cover this request."
          : raw;
      toast.error("Cannot approve request", { description: message, duration: 7000 });
    },
  });
}

export function useRejectLeaveRequestMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    // comment is required on RejectInput — enforced at the type level
    mutationFn: ({ requestId, body }: { requestId: string; body: RejectInput }) =>
      rejectLeaveRequest(auth!.token, auth!.orgId, requestId, body),
    onSuccess: () => {
      toast.success("Leave request rejected");
      queryClient.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY(orgSlug) });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to reject request";
      toast.error(message);
    },
  });
}

// ── Leave Type Mutations ──────────────────────────────────────────────────────

export function useCreateLeaveTypeMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: LeaveTypeCreateInput) =>
      createLeaveType(auth!.token, auth!.orgId, body),
    onSuccess: () => {
      toast.success("Leave type created");
      queryClient.invalidateQueries({ queryKey: LEAVE_TYPES_KEY(orgSlug) });
      queryClient.invalidateQueries({ queryKey: LEAVE_ALL_TYPES_KEY(orgSlug) });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to create leave type";
      toast.error(message);
    },
  });
}

export function useUpdateLeaveTypeMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ typeId, body }: { typeId: string; body: LeaveTypeUpdateInput }) =>
      updateLeaveType(auth!.token, auth!.orgId, typeId, body),
    onSuccess: () => {
      toast.success("Leave type updated");
      queryClient.invalidateQueries({ queryKey: LEAVE_TYPES_KEY(orgSlug) });
      queryClient.invalidateQueries({ queryKey: LEAVE_ALL_TYPES_KEY(orgSlug) });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to update leave type";
      toast.error(message);
    },
  });
}

export function useDeleteLeaveTypeMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (typeId: string) =>
      deleteLeaveType(auth!.token, auth!.orgId, typeId),
    onSuccess: () => {
      toast.success("Leave type deleted");
      queryClient.invalidateQueries({ queryKey: LEAVE_TYPES_KEY(orgSlug) });
      queryClient.invalidateQueries({ queryKey: LEAVE_ALL_TYPES_KEY(orgSlug) });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to delete leave type";
      toast.error(message);
    },
  });
}

// ── Balance Mutations ────────────────────────────────────────────────────────

export function useAllocateBalanceMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: BalanceAllocateInput) =>
      allocateBalance(auth!.token, auth!.orgId, body),
    onSuccess: () => {
      toast.success("Balance allocated");
      queryClient.invalidateQueries({ queryKey: LEAVE_BALANCES_KEY(orgSlug) });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to allocate balance";
      toast.error(message);
    },
  });
}

export function useAutoAllocateBalancesMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: AutoAllocateInput) =>
      autoAllocateBalances(auth!.token, auth!.orgId, body),
    onSuccess: (data) => {
      toast.success(`Auto-allocated ${data.count} balances`);
      queryClient.invalidateQueries({ queryKey: LEAVE_BALANCES_KEY(orgSlug) });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to auto-allocate balances";
      toast.error(message);
    },
  });
}

// ── Holiday Mutations ─────────────────────────────────────────────────────────

export function useCreateHolidayMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: HolidayCreateInput) =>
      createHoliday(auth!.token, auth!.orgId, body),
    onSuccess: () => {
      toast.success("Holiday created");
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_KEY(orgSlug) });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to create holiday";
      toast.error(message);
    },
  });
}

export function useUpdateHolidayMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ holidayId, body }: { holidayId: string; body: HolidayUpdateInput }) =>
      updateHoliday(auth!.token, auth!.orgId, holidayId, body),
    onSuccess: () => {
      toast.success("Holiday updated");
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_KEY(orgSlug) });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to update holiday";
      toast.error(message);
    },
  });
}

export function useDeleteHolidayMutation(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (holidayId: string) =>
      deleteHoliday(auth!.token, auth!.orgId, holidayId),
    onSuccess: () => {
      toast.success("Holiday deleted");
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_KEY(orgSlug) });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to delete holiday";
      toast.error(message);
    },
  });
}
