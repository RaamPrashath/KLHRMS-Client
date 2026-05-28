'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { ACTION_GREEN } from '@/modules/assets/lib/assetConfig';
import {
  DateField,
  FieldSelect,
  TextAreaField,
} from '@/modules/assets/components/assetsPagePrimitives';
import { humanize } from '@/modules/assets/lib/assetUtils';
import { assetConditionOptions, type AssetMaintenanceUpdateInput } from '@/modules/assets/schema/assetSchemas';
import type { AssetCondition } from '@/modules/assets/types/assetTypes';

export function MaintenanceUpdateDialog({
  open,
  onOpenChange,
  form,
  setForm,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: AssetMaintenanceUpdateInput | null;
  setForm: (value: AssetMaintenanceUpdateInput | null) => void;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw]! max-w-160! rounded-2xl border border-[#e5e7eb] bg-white p-0">
        <div className="flex flex-col">
          <DialogHeader className="border-b border-[#eef0f3] px-6 py-5 text-left">
            <DialogTitle className="text-[22px] font-semibold tracking-[-0.02em] text-[#111827]">
              Complete Maintenance
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-6 text-[#6b7280]">
              Finalize the maintenance record and choose the next asset status.
            </DialogDescription>
          </DialogHeader>

          {!form ? (
            <div className="px-6 py-8 text-[14px] text-[#6b7280]">No maintenance record selected.</div>
          ) : (
            <>
              <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                     setForm({
                      ...form,
                      status: value as AssetMaintenanceUpdateInput['status'],
                    })
                  }
                >
                  <FieldSelect label="Status">
                    <SelectValue />
                  </FieldSelect>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <DateField
                  label="Expected Completion Date"
                  value={form.expectedCompletionDate || ''}
                  onChange={(value) => setForm({ ...form, expectedCompletionDate: value })}
                />

                <DateField
                  label="Completed Date"
                  value={form.completedDate || ''}
                  onChange={(value) => setForm({ ...form, completedDate: value })}
                />

                <Select
                  value={form.conditionAfterMaintenance || undefined}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      conditionAfterMaintenance: value as AssetCondition,
                    })
                  }
                >
                  <FieldSelect label="Condition After Maintenance">
                    <SelectValue placeholder="Select condition" />
                  </FieldSelect>
                  <SelectContent>
                    {assetConditionOptions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {humanize(condition)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={form.nextAssetStatus || undefined}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      nextAssetStatus: value as AssetMaintenanceUpdateInput['nextAssetStatus'],
                    })
                  }
                >
                  <FieldSelect label="Next Asset Status">
                    <SelectValue placeholder="Select status" />
                  </FieldSelect>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                    <SelectItem value="RETIRED">Retired</SelectItem>
                    <SelectItem value="DISPOSED">Disposed</SelectItem>
                    <SelectItem value="IN_MAINTENANCE">In Maintenance</SelectItem>
                    <SelectItem value="PENDING_RETURN">Pending Return</SelectItem>
                  </SelectContent>
                </Select>

                <TextAreaField
                  label="Notes"
                  value={form.notes || ''}
                  onChange={(value) => setForm({ ...form, notes: value })}
                />
              </div>

              <DialogFooter className="border-t border-[#eef0f3] px-6 py-4">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-lg px-4">
                  Cancel
                </Button>
                <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="rounded-lg px-5 text-white"
                  style={{ backgroundColor: ACTION_GREEN }}
                >
                  {isSaving ? 'Saving...' : 'Save Maintenance'}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
