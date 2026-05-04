"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useLeaveRequestsQuery } from "@/hooks/queries/leave";
import {
  useCancelLeaveRequestMutation,
  useApproveLeaveRequestMutation,
  useRejectLeaveRequestMutation,
} from "@/hooks/mutations/leave";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  CalendarX2,
  Clock,
} from "lucide-react";
import { type LeaveRequest, LeaveStatus, LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS } from "@/hooks/functions/leave";

interface LeaveRequestsTableProps {
  orgSlug: string;
  orgId: string;
  canApprove: boolean;
}

const STATUS_FILTERS: { label: string; value: LeaveStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" as LeaveStatus },
  { label: "Approved", value: "approved" as LeaveStatus },
  { label: "Rejected", value: "rejected" as LeaveStatus },
];
export function LeaveRequestsTable({
  orgSlug,
  orgId,
  canApprove,
}: LeaveRequestsTableProps) {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");
  const [actionRequest, setActionRequest] = useState<LeaveRequest | null>(null);
  const [dialogMode, setDialogMode] = useState<"cancel" | "approve" | "reject" | null>(null);
  const [comment, setComment] = useState("");

  const statusParam = statusFilter === "all" ? undefined : statusFilter;
  const { data: requests = [], isLoading } = useLeaveRequestsQuery(orgSlug, orgId, statusParam);

  const cancelMutation = useCancelLeaveRequestMutation(orgSlug, orgId);
  const approveMutation = useApproveLeaveRequestMutation(orgSlug, orgId);
  const rejectMutation = useRejectLeaveRequestMutation(orgSlug, orgId);

  const openDialog = (request: LeaveRequest, mode: "cancel" | "approve" | "reject") => {
    setActionRequest(request);
    setDialogMode(mode);
    setComment("");
  };

  const closeDialog = () => {
    setActionRequest(null);
    setDialogMode(null);
    setComment("");
  };

  const handleConfirm = () => {
    if (!actionRequest || !dialogMode) return;
    if (dialogMode === "cancel") {
      cancelMutation.mutate(actionRequest.id, { onSuccess: closeDialog });
    } else if (dialogMode === "approve") {
      // ApproveInput.comment is optional, pass undefined (not null) for optional fields
      approveMutation.mutate(
        { requestId: actionRequest.id, body: { comment: comment || "Request approved" } },
        { onSuccess: closeDialog },
      );
    } else if (dialogMode === "reject") {
      // RejectInput.comment is required and must be non-empty
      // The UI should prevent submitting with empty comment
      rejectMutation.mutate(
        { requestId: actionRequest.id, body: { comment: comment || "Request rejected" } },
        { onSuccess: closeDialog },
      );
    }
  };

  const isActionPending =
    cancelMutation.isPending || approveMutation.isPending || rejectMutation.isPending;

  const isPending = (s: string) => s === LeaveStatus.PENDING;

  return (
    <div className="flex flex-col gap-5">
      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={[
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 border",
              statusFilter === value
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground hover:bg-muted/40",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
              <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 py-3">
                Employee
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 py-3">
                Leave Type
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 py-3">
                Period
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 py-3 text-right">
                Days
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 py-3">
                Status
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 py-3 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground/50" />
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-full bg-muted/60 p-4">
                      <CalendarX2 className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {statusFilter === "all" ? "No leave requests yet" : `No ${statusFilter} requests`}
                      </p>
                      {statusFilter === "all" && (
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Use "New Request" to submit your first leave request.
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow
                  key={req.id}
                  className="group transition-colors hover:bg-muted/20 border-b last:border-0"
                >
                  {/* Employee */}
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold leading-tight">
                        {req.employee_name || "You"}
                      </span>
                      {req.employee_email && (
                        <span className="text-xs text-muted-foreground">
                          {req.employee_email}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Leave type */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-offset-1"
                        style={{
                          backgroundColor: req.leave_type_color || "#94a3b8",
                          
                        }}
                      />
                      <span className="text-sm font-medium">{req.leave_type_name || "—"}</span>
                    </div>
                  </TableCell>

                  {/* Period */}
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-0.5 text-sm">
                      <span className="font-medium">
                        {format(parseISO(req.start_date), "MMM d, yyyy")}
                      </span>
                      {req.start_date !== req.end_date && (
                        <span className="text-xs text-muted-foreground">
                          → {format(parseISO(req.end_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Days */}
                  <TableCell className="py-4 text-right">
                    <span className="tabular-nums text-sm font-bold">{req.days}</span>
                    <span className="text-xs text-muted-foreground ml-0.5">d</span>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-4">
                    <Badge
                      variant="outline"
                      className={["text-xs font-semibold gap-1.5 px-2.5 py-1 rounded-full", LEAVE_STATUS_COLORS[req.status]].join(" ")}
                    >
                      {isPending(req.status) && <Clock className="h-3 w-3" />}
                      {LEAVE_STATUS_LABELS[req.status] ?? req.status}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isPending(req.status) && canApprove && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-400 transition-all gap-1"
                            onClick={() => openDialog(req, "approve")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs font-semibold text-red-600 border-red-200 bg-red-50/50 hover:bg-red-100 hover:border-red-400 transition-all gap-1"
                            onClick={() => openDialog(req, "reject")}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      )}
                      {isPending(req.status) && !canApprove && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all gap-1"
                          onClick={() => openDialog(req, "cancel")}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirm dialog */}
      <Dialog open={!!dialogMode} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className={[
              "w-10 h-10 rounded-full flex items-center justify-center mb-2",
              dialogMode === "approve" ? "bg-emerald-100" : "bg-red-100",
            ].join(" ")}>
              {dialogMode === "approve" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {dialogMode === "reject" && <XCircle className="h-5 w-5 text-red-600" />}
              {dialogMode === "cancel" && <Ban className="h-5 w-5 text-red-600" />}
            </div>
            <DialogTitle className="text-base">
              {dialogMode === "approve" && "Approve Leave Request"}
              {dialogMode === "reject" && "Reject Leave Request"}
              {dialogMode === "cancel" && "Cancel Leave Request"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {dialogMode === "approve" &&
                `Approve leave for ${actionRequest?.employee_name || "this employee"}? Days will be deducted from their balance.`}
              {dialogMode === "reject" &&
                `Reject leave request from ${actionRequest?.employee_name || "this employee"}?`}
              {dialogMode === "cancel" &&
                "Cancel your pending leave request? This cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          {(dialogMode === "approve" || dialogMode === "reject") && (
            <div className="flex flex-col gap-2 mt-1">
              <Label htmlFor="action-comment" className="text-sm font-medium">
                Comment <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="action-comment"
                placeholder="Add a note for the employee…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={closeDialog} disabled={isActionPending}>
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isActionPending}
              variant={dialogMode === "reject" || dialogMode === "cancel" ? "destructive" : "default"}
              className={dialogMode === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
            >
              {isActionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogMode === "approve" && "Approve"}
              {dialogMode === "reject" && "Reject"}
              {dialogMode === "cancel" && "Cancel Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}