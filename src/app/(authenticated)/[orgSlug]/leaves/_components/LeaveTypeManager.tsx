"use client";

/**
 * LeaveTypeManager — CRUD interface for leave type configuration.
 */

import { useState } from "react";
import { useAllLeaveTypesQuery } from "@/hooks/queries/leave";
import {
  useCreateLeaveTypeMutation,
  useUpdateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
} from "@/hooks/mutations/leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import type { LeaveTypeConfig } from "@/hooks/functions/leave";

interface LeaveTypeManagerProps {
  orgSlug: string;
  orgId: string;
}

export function LeaveTypeManager({ orgSlug, orgId }: LeaveTypeManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeConfig | null>(null);

  const [name, setName] = useState("");
  const [quota, setQuota] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [carryForward, setCarryForward] = useState(false);
  const [isPaid, setIsPaid] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");

  const { data: types = [], isLoading } = useAllLeaveTypesQuery(orgSlug, orgId);
  const createMutation = useCreateLeaveTypeMutation(orgSlug, orgId);
  const updateMutation = useUpdateLeaveTypeMutation(orgSlug, orgId);
  const deleteMutation = useDeleteLeaveTypeMutation(orgSlug, orgId);

  const resetForm = () => {
    setName("");
    setQuota("");
    setColor("#3b82f6");
    setCarryForward(false);
    setIsPaid(true);
    setIsActive(true);
    setDescription("");
    setEditingType(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (lt: LeaveTypeConfig) => {
    setEditingType(lt);
    setName(lt.name);
    setQuota(String(lt.quota));
    setColor(lt.color);
    setCarryForward(lt.carry_forward);
    setIsPaid(lt.is_paid);
    setIsActive(lt.is_active);
    setDescription(lt.description || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !quota.trim()) return;

    const payload = {
      name: name.trim(),
      quota: parseFloat(quota),
      carry_forward: carryForward,
      is_paid: isPaid,
      color,
      description: description.trim() || undefined,
    };

    if (editingType) {
      updateMutation.mutate(
        {
          typeId: editingType.id,
          body: {
            ...payload,
            is_active: isActive,
          },
        },
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
    if (confirm("Are you sure you want to delete this leave type?")) {
      deleteMutation.mutate(id);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Leave Types</CardTitle>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Type
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : types.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No leave types configured yet</p>
            <p className="text-xs mt-1">Add leave types to enable employees to submit requests</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Quota</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((lt) => (
                  <TableRow key={lt.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: lt.color }}
                        />
                        <span className="font-medium text-sm">{lt.name}</span>
                      </div>
                      {lt.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-5">
                          {lt.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{lt.quota} days</TableCell>
                    <TableCell>
                      {lt.is_paid ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      {lt.carry_forward ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={lt.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {lt.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(lt)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(lt.id)}
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Leave Type" : "Create Leave Type"}
            </DialogTitle>
            <DialogDescription>
              Configure leave type quota, carry-forward, and payment rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="lt-name">Name</Label>
              <Input
                id="lt-name"
                placeholder="e.g., Annual Leave"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lt-quota">Quota (days)</Label>
                <Input
                  id="lt-quota"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g., 21"
                  value={quota}
                  onChange={(e) => setQuota(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lt-color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="lt-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lt-description">Description (optional)</Label>
              <Input
                id="lt-description"
                placeholder="Brief description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Paid Leave</Label>
                <p className="text-xs text-muted-foreground">
                  Deducts from employee balance
                </p>
              </div>
              <Switch checked={isPaid} onCheckedChange={setIsPaid} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Carry Forward</Label>
                <p className="text-xs text-muted-foreground">
                  Unused days carry to next year
                </p>
              </div>
              <Switch checked={carryForward} onCheckedChange={setCarryForward} />
            </div>

            {editingType && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable for new requests
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || !name.trim() || !quota.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingType ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
