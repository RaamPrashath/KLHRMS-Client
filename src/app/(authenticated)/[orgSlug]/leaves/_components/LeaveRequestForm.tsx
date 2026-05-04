"use client";

/**
 * LeaveRequestForm
 *
 * Fixes:
 * - Proper date validation + prevents past dates
 * - End date auto-resets if before start date
 * - Select works reliably inside Dialog
 * - Better UX states
 * - Mutation safety
 * - Prevent duplicate submissions
 * - Clears field-specific errors on change
 */

import { useEffect, useMemo, useState } from "react";
import { format, startOfDay } from "date-fns";

import { useLeaveTypesQuery } from "@/hooks/queries/leave";
import { useLeaveBalancesQuery } from "@/hooks/queries/leave";
import { useSubmitLeaveRequestMutation } from "@/hooks/mutations/leave";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2, Plus, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LeaveRequestFormProps {
  orgSlug: string;
  orgId: string;
}

export function LeaveRequestForm({
  orgSlug,
  orgId,
}: LeaveRequestFormProps) {
  const today = useMemo(() => startOfDay(new Date()), []);

  const [open, setOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: leaveTypes = [], isLoading: leaveTypesLoading } =
    useLeaveTypesQuery(orgSlug, orgId);

  const { data: balances = [], isLoading: balancesLoading } =
    useLeaveBalancesQuery(orgSlug, orgId, undefined, new Date().getFullYear());

  const submitMutation = useSubmitLeaveRequestMutation(orgSlug, orgId);

  // Auto-fix invalid end date if start date changes
  useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      setEndDate(undefined);
    }
  }, [startDate, endDate]);

  const resetForm = () => {
    setLeaveTypeId("");
    setStartDate(undefined);
    setEndDate(undefined);
    setReason("");
    setErrors({});
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!leaveTypeId) {
      newErrors.leaveType = "Please select a leave type";
    }

    if (!startDate) {
      newErrors.startDate = "Please select a start date";
    }

    if (!endDate) {
      newErrors.endDate = "Please select an end date";
    }

    if (startDate && startDate < today) {
      newErrors.startDate = "Start date cannot be in the past";
    }

    if (startDate && endDate && endDate < startDate) {
      newErrors.endDate = "End date must be after start date";
    }

    if (reason.length > 500) {
      newErrors.reason = "Reason must be under 500 characters";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (submitMutation.isPending) return;

    if (!validate() || !startDate || !endDate) {
      return;
    }

    // Guard: if the selected leave type is paid, check that the employee
    // has a balance allocated for this year before hitting the API.
    const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);
    if (selectedType?.is_paid) {
      const hasBalance = balances.some(
        (b) => b.leave_type_id === leaveTypeId && b.remaining > 0,
      );
      const hasAnyBalance = balances.some((b) => b.leave_type_id === leaveTypeId);

      if (!hasAnyBalance) {
        toast.error("No leave balance", {
          description: `You have no ${selectedType.name} balance allocated for this year. Contact HR to allocate your balance.`,
          duration: 6000,
        });
        return;
      }

      if (!hasBalance) {
        toast.error("Insufficient leave balance", {
          description: `You have no remaining ${selectedType.name} days. Your balance is exhausted for this year.`,
          duration: 6000,
        });
        return;
      }
    }

    submitMutation.mutate(
      {
        leave_type_id: leaveTypeId,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        reason: reason.trim() ? reason.trim() : null,
      },
      {
        onSuccess: () => {
          resetForm();
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);

        if (!value) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 font-semibold shadow-sm">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px] overflow-visible">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>

          <DialogTitle className="text-lg font-semibold">
            Submit Leave Request
          </DialogTitle>

          <DialogDescription>
            Select your leave type, dates, and optional reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Leave Type */}
          <div className="space-y-2">
            <Label htmlFor="leave-type" className="font-medium">
              Leave Type
            </Label>

            <Select
              value={leaveTypeId}
              onValueChange={(value) => {
                setLeaveTypeId(value);
                clearError("leaveType");
              }}
            >
              <SelectTrigger
                id="leave-type"
                className={cn(
                  "h-10 w-full",
                  errors.leaveType &&
                    "border-red-500 focus:ring-red-200"
                )}
              >
                <SelectValue
                  placeholder={
                    leaveTypesLoading
                      ? "Loading leave types..."
                      : "Select leave type"
                  }
                />
              </SelectTrigger>

              <SelectContent
                position="popper"
                className="z-[9999]"
              >
                {leaveTypes.length > 0 ? (
                  leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              type.color || "#6b7280",
                          }}
                        />
                        <span>{type.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({type.is_paid ? "Paid" : "Unpaid"})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem
                    value="no-leave-types"
                    disabled
                  >
                    No leave types available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {errors.leaveType && (
              <p className="text-xs font-medium text-red-500">
                {errors.leaveType}
              </p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Start Date */}
            <div className="space-y-2">
              <Label className="font-medium">Start Date</Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 w-full justify-start text-left font-normal",
                      !startDate &&
                        "text-muted-foreground",
                      errors.startDate &&
                        "border-red-500"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 shrink-0" />

                    {startDate
                      ? format(startDate, "MMM d, yyyy")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  align="start"
                  className="z-[9999] w-auto p-0"
                >
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      clearError("startDate");
                    }}
                    disabled={(date) =>
                      startOfDay(date) < today
                    }
                  />
                </PopoverContent>
              </Popover>

              {errors.startDate && (
                <p className="text-xs font-medium text-red-500">
                  {errors.startDate}
                </p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label className="font-medium">End Date</Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 w-full justify-start text-left font-normal",
                      !endDate &&
                        "text-muted-foreground",
                      errors.endDate &&
                        "border-red-500"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 shrink-0" />

                    {endDate
                      ? format(endDate, "MMM d, yyyy")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  align="start"
                  className="z-[9999] w-auto p-0"
                >
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      clearError("endDate");
                    }}
                    disabled={(date) =>
                      startDate
                        ? startOfDay(date) <
                          startOfDay(startDate)
                        : startOfDay(date) < today
                    }
                  />
                </PopoverContent>
              </Popover>

              {errors.endDate && (
                <p className="text-xs font-medium text-red-500">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label
              htmlFor="reason"
              className="font-medium"
            >
              Reason{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>

            <Textarea
              id="reason"
              placeholder="Briefly describe your leave reason..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                clearError("reason");
              }}
              maxLength={500}
              rows={4}
              className="resize-none"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {errors.reason ? (
                  <span className="text-red-500">
                    {errors.reason}
                  </span>
                ) : (
                  "Optional"
                )}
              </span>

              <span>{reason.length}/500</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitMutation.isPending}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitMutation.isPending ||
              leaveTypesLoading ||
              balancesLoading
            }
            className="font-semibold"
          >
            {submitMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}

            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}