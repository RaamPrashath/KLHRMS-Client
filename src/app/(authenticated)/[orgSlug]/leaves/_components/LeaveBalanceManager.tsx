"use client";

/**
 * LeaveBalanceManager
 *
 * HR / Admin interface for managing employee leave balances.
 *
 * Features:
 * - View all balances across the org (filterable by employee + year)
 * - Allocate or update a balance for a specific employee + leave type + year
 * - Auto-allocate balances for all employees based on leave type quotas
 * - Live calculation: shows used days and computed remaining as you type
 * - Inline edit: click any row to pre-fill the allocation form
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useOrgMembersQuery, useLeaveBalancesQuery, useAllLeaveTypesQuery } from "@/hooks/queries/leave";
import {
  useAllocateBalanceMutation,
  useAutoAllocateBalancesMutation,
} from "@/hooks/mutations/leave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Loader2,
  Plus,
  Wand2,
  Pencil,
  Users,
  CalendarDays,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  Search,
} from "lucide-react";
import type { LeaveBalance } from "@/hooks/functions/leave";
import { cn } from "@/lib/utils";

interface LeaveBalanceManagerProps {
  orgSlug: string;
  orgId: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export function LeaveBalanceManager({ orgSlug, orgId }: LeaveBalanceManagerProps) {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<number>(CURRENT_YEAR);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Allocation form state ─────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [formEmployee, setFormEmployee] = useState("");
  const [formLeaveType, setFormLeaveType] = useState("");
  const [formYear, setFormYear] = useState(String(CURRENT_YEAR));
  const [formAllocated, setFormAllocated] = useState("");
  const [editingBalance, setEditingBalance] = useState<LeaveBalance | null>(null);

  // ── Auto-allocate dialog ──────────────────────────────────────────────────
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoYear, setAutoYear] = useState(String(CURRENT_YEAR));

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: members = [], isLoading: membersLoading } = useOrgMembersQuery(orgSlug, orgId);
  const { data: leaveTypes = [], isLoading: typesLoading } = useAllLeaveTypesQuery(orgSlug, orgId);
  const {
    data: allBalances = [],
    isLoading: balancesLoading,
    isFetching,
  } = useLeaveBalancesQuery(
    orgSlug,
    orgId,
    filterEmployee === "all" ? undefined : filterEmployee,
    filterYear,
  );

  const allocateMutation = useAllocateBalanceMutation(orgSlug, orgId);
  const autoAllocateMutation = useAutoAllocateBalancesMutation(orgSlug, orgId);

  // ── Derived: existing balance for the current form selection ─────────────
  const existingBalance = useMemo(() => {
    if (!formEmployee || !formLeaveType || !formYear) return null;
    return allBalances.find(
      (b) =>
        b.employee_id === formEmployee &&
        b.leave_type_id === formLeaveType &&
        b.year === parseInt(formYear, 10),
    ) ?? null;
  }, [allBalances, formEmployee, formLeaveType, formYear]);

  // Live calculation: remaining = allocated - used
  const liveAllocated = parseFloat(formAllocated) || 0;
  const liveUsed = existingBalance?.used ?? 0;
  const liveRemaining = Math.max(0, liveAllocated - liveUsed);

  // ── Filtered display rows ─────────────────────────────────────────────────
  const displayBalances = useMemo(() => {
    if (!searchQuery.trim()) return allBalances;
    const q = searchQuery.toLowerCase();
    return allBalances.filter(
      (b) =>
        b.employee_name?.toLowerCase().includes(q) ||
        b.leave_type_name?.toLowerCase().includes(q),
    );
  }, [allBalances, searchQuery]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormEmployee("");
    setFormLeaveType("");
    setFormYear(String(CURRENT_YEAR));
    setFormAllocated("");
    setEditingBalance(null);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (balance: LeaveBalance) => {
    setEditingBalance(balance);
    setFormEmployee(balance.employee_id);
    setFormLeaveType(balance.leave_type_id);
    setFormYear(String(balance.year));
    setFormAllocated(String(balance.allocated));
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!formEmployee || !formLeaveType || !formYear || !formAllocated) return;
    const allocated = parseFloat(formAllocated);
    if (isNaN(allocated) || allocated < 0) return;

    allocateMutation.mutate(
      {
        employee_id: formEmployee,
        leave_type_id: formLeaveType,
        year: parseInt(formYear, 10),
        allocated,
      },
      {
        onSuccess: () => {
          setFormOpen(false);
          resetForm();
        },
      },
    );
  };

  const handleAutoAllocate = () => {
    const year = parseInt(autoYear, 10);
    if (isNaN(year)) return;
    autoAllocateMutation.mutate(
      { year },
      { onSuccess: () => setAutoOpen(false) },
    );
  };

  const isLoading = membersLoading || typesLoading || balancesLoading;
  const formValid = !!formEmployee && !!formLeaveType && !!formYear && !!formAllocated && parseFloat(formAllocated) >= 0;

  // ── Org-wide summary ──────────────────────────────────────────────────────
  const summary = useMemo(
    () =>
      allBalances.reduce(
        (acc, b) => {
          acc.totalAllocated += b.allocated;
          acc.totalUsed += b.used;
          acc.totalRemaining += b.remaining;
          acc.employeeCount.add(b.employee_id);
          return acc;
        },
        { totalAllocated: 0, totalUsed: 0, totalRemaining: 0, employeeCount: new Set<string>() },
      ),
    [allBalances],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header row ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Balance Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Allocate and track leave balances across your organization.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setAutoOpen(true)}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Auto-Allocate
          </Button>
          <Button size="sm" className="gap-1.5 text-xs font-semibold" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Allocate Balance
          </Button>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <AnimatePresence mode="wait">
        {!isLoading && allBalances.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-px sm:grid-cols-4 rounded-xl border overflow-hidden bg-border shadow-sm"
          >
            {[
              {
                label: "Employees",
                value: summary.employeeCount.size,
                sub: "with balances",
                icon: Users,
              },
              {
                label: "Total Allocated",
                value: summary.totalAllocated,
                sub: "days this year",
                icon: CalendarDays,
              },
              {
                label: "Days Used",
                value: summary.totalUsed,
                sub: "leave taken",
                icon: TrendingUp,
              },
              {
                label: "Days Remaining",
                value: summary.totalRemaining,
                sub: "available",
                icon: AlertCircle,
              },
            ].map(({ label, value, sub, icon: Icon }) => (
              <div key={label} className="bg-card px-5 py-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    {label}
                  </p>
                </div>
                <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search employee or leave type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Employee filter */}
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="h-9 w-[200px] text-sm">
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year filter */}
        <Select
          value={String(filterYear)}
          onValueChange={(v) => setFilterYear(parseInt(v, 10))}
        >
          <SelectTrigger className="h-9 w-[110px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFetching && !balancesLoading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/50 shrink-0" />
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
              {["Employee", "Leave Type", "Year", "Allocated", "Used", "Remaining", ""].map(
                (h) => (
                  <TableHead
                    key={h}
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 py-3",
                      h === "Allocated" || h === "Used" || h === "Remaining"
                        ? "text-right"
                        : "",
                      h === "" ? "text-right" : "",
                    )}
                  >
                    {h}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j} className="py-3">
                      <Skeleton className="h-4 rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : displayBalances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-full bg-muted/60 p-4">
                      <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">
                        No balances found
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Use "Allocate Balance" to assign leave days, or "Auto-Allocate" to
                        apply quotas to all employees at once.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayBalances.map((balance) => {
                const total = balance.allocated + balance.carried_forward;
                const pct = total > 0 ? Math.round((balance.used / total) * 100) : 0;
                const isLow = balance.remaining < total * 0.2 && total > 0;
                const color = balance.leave_type_color || "#94a3b8";

                return (
                  <TableRow
                    key={balance.id}
                    className="group hover:bg-muted/20 border-b last:border-0 transition-colors"
                  >
                    {/* Employee */}
                    <TableCell className="py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold leading-tight">
                          {balance.employee_name || balance.employee_id.slice(0, 8)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Leave type */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm">{balance.leave_type_name || "—"}</span>
                      </div>
                    </TableCell>

                    {/* Year */}
                    <TableCell className="py-3.5">
                      <Badge variant="outline" className="text-xs font-medium tabular-nums">
                        {balance.year}
                      </Badge>
                    </TableCell>

                    {/* Allocated */}
                    <TableCell className="py-3.5 text-right">
                      <span className="tabular-nums text-sm font-semibold">
                        {balance.allocated}
                      </span>
                      {balance.carried_forward > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          +{balance.carried_forward}cf
                        </span>
                      )}
                    </TableCell>

                    {/* Used */}
                    <TableCell className="py-3.5 text-right">
                      <span className="tabular-nums text-sm text-muted-foreground">
                        {balance.used}
                      </span>
                    </TableCell>

                    {/* Remaining */}
                    <TableCell className="py-3.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={cn(
                            "tabular-nums text-sm font-bold",
                            isLow ? "text-amber-600" : "text-foreground",
                          )}
                        >
                          {balance.remaining % 1 === 0
                            ? balance.remaining
                            : balance.remaining.toFixed(1)}
                        </span>
                        {/* Mini progress bar */}
                        <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              isLow ? "bg-amber-500" : "bg-foreground/30",
                            )}
                            style={{ width: `${Math.min(100, 100 - pct)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEdit(balance)}
                        aria-label="Edit balance"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Allocate / Edit Dialog ── */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold">
              {editingBalance ? "Update Leave Balance" : "Allocate Leave Balance"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingBalance
                ? "Adjust the allocated days. Used days are calculated automatically."
                : "Set the number of leave days for an employee and leave type."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Employee */}
            <div className="space-y-1.5">
              <Label htmlFor="bal-employee" className="text-sm font-medium">
                Employee
              </Label>
              <Select
                value={formEmployee}
                onValueChange={setFormEmployee}
                disabled={!!editingBalance}
              >
                <SelectTrigger id="bal-employee" className="h-10">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{m.name || m.email}</span>
                        {m.name && (
                          <span className="text-xs text-muted-foreground">{m.email}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Leave type */}
            <div className="space-y-1.5">
              <Label htmlFor="bal-type" className="text-sm font-medium">
                Leave Type
              </Label>
              <Select
                value={formLeaveType}
                onValueChange={setFormLeaveType}
                disabled={!!editingBalance}
              >
                <SelectTrigger id="bal-type" className="h-10">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: lt.color }}
                        />
                        <span>{lt.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({lt.quota}d quota)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year + Allocated side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bal-year" className="text-sm font-medium">
                  Year
                </Label>
                <Select
                  value={formYear}
                  onValueChange={setFormYear}
                  disabled={!!editingBalance}
                >
                  <SelectTrigger id="bal-year" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bal-allocated" className="text-sm font-medium">
                  Allocated Days
                </Label>
                <Input
                  id="bal-allocated"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g. 21"
                  value={formAllocated}
                  onChange={(e) => setFormAllocated(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            {/* Live calculation panel */}
            <AnimatePresence>
              {formAllocated && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg border bg-muted/30 p-3.5 flex flex-col gap-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                      Balance Preview
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "Allocated", value: liveAllocated, accent: false },
                        { label: "Used", value: liveUsed, accent: false },
                        {
                          label: "Remaining",
                          value: liveRemaining,
                          accent: liveRemaining < liveAllocated * 0.2 && liveAllocated > 0,
                        },
                      ].map(({ label, value, accent }) => (
                        <div key={label} className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {label}
                          </span>
                          <span
                            className={cn(
                              "text-xl font-black tabular-nums leading-none",
                              accent ? "text-amber-600" : "text-foreground",
                            )}
                          >
                            {value % 1 === 0 ? value : value.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {existingBalance && (
                      <p className="text-xs text-muted-foreground text-center">
                        Updating existing balance (was {existingBalance.allocated} days)
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={allocateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formValid || allocateMutation.isPending}
              className="font-semibold"
            >
              {allocateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingBalance ? "Update Balance" : "Allocate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Auto-Allocate Dialog ── */}
      <Dialog open={autoOpen} onOpenChange={setAutoOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold">Auto-Allocate Balances</DialogTitle>
            <DialogDescription className="text-sm">
              Automatically create leave balances for all employees based on each leave
              type's quota. Employees who already have a balance for the selected year
              are skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="auto-year" className="text-sm font-medium">
                Year
              </Label>
              <Select value={autoYear} onValueChange={setAutoYear}>
                <SelectTrigger id="auto-year" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-semibold mb-0.5">What this does</p>
              <p>
                For each active leave type with a quota &gt; 0, a balance record is created
                for every org member who doesn't already have one for {autoYear}.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAutoOpen(false)}
              disabled={autoAllocateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAutoAllocate}
              disabled={autoAllocateMutation.isPending}
              className="font-semibold"
            >
              {autoAllocateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Run Auto-Allocate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
