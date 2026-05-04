"use client";

/**
 * HolidayManager — CRUD interface for public holidays.
 */

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useHolidaysQuery } from "@/hooks/queries/leave";
import {
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
} from "@/hooks/mutations/leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2, CalendarDays, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Holiday } from "@/hooks/functions/leave";

interface HolidayManagerProps {
  orgSlug: string;
  orgId: string;
}

export function HolidayManager({ orgSlug, orgId }: HolidayManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const [name, setName] = useState("");
  const [holidayDate, setHolidayDate] = useState<Date | undefined>(undefined);
  const [isRecurring, setIsRecurring] = useState(false);
  const [description, setDescription] = useState("");

  const { data: holidays = [], isLoading } = useHolidaysQuery(orgSlug, orgId);
  const createMutation = useCreateHolidayMutation(orgSlug, orgId);
  const updateMutation = useUpdateHolidayMutation(orgSlug, orgId);
  const deleteMutation = useDeleteHolidayMutation(orgSlug, orgId);

  const resetForm = () => {
    setName("");
    setHolidayDate(undefined);
    setIsRecurring(false);
    setDescription("");
    setEditingHoliday(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (h: Holiday) => {
    setEditingHoliday(h);
    setName(h.name);
    setHolidayDate(parseISO(h.holiday_date));
    setIsRecurring(h.is_recurring);
    setDescription(h.description || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !holidayDate) return;

    const payload = {
      name: name.trim(),
      holiday_date: format(holidayDate, "yyyy-MM-dd"),
      is_recurring: isRecurring,
      description: description.trim() || undefined,
    };

    if (editingHoliday) {
      updateMutation.mutate(
        { holidayId: editingHoliday.id, body: payload },
        {
          onSuccess: () => {
            setDialogOpen(false);
            resetForm();
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this holiday?")) {
      deleteMutation.mutate(id);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Sort holidays by date
  const sortedHolidays = [...holidays].sort(
    (a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime(),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Public Holidays</CardTitle>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Holiday
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedHolidays.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No holidays configured yet</p>
            <p className="text-xs mt-1">Add public holidays for accurate leave calculations</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHolidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-sm font-medium">
                      {format(parseISO(h.holiday_date), "MMM d, yyyy")}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({format(parseISO(h.holiday_date), "EEE")})
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{h.name}</span>
                      {h.description && (
                        <p className="text-xs text-muted-foreground">{h.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {h.is_recurring ? (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <Repeat className="h-3.5 w-3.5" />
                          Yearly
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Once</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(h)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(h.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? "Edit Holiday" : "Add Holiday"}
            </DialogTitle>
            <DialogDescription>
              Configure public holidays for leave calculations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="h-name">Holiday Name</Label>
              <Input
                id="h-name"
                placeholder="e.g., Republic Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !holidayDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {holidayDate ? format(holidayDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={holidayDate}
                    onSelect={setHolidayDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="h-description">Description (optional)</Label>
              <Input
                id="h-description"
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Recurring Yearly</Label>
                <p className="text-xs text-muted-foreground">
                  Repeats on this date every year
                </p>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !name.trim() || !holidayDate}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingHoliday ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
