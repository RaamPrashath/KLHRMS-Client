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
import { ACTION_GREEN } from '@/modules/assets/components/assetsPageConfig';
import {
  DateField,
  FieldSelect,
  InputField,
  NumberField,
} from '@/modules/assets/components/assetsPagePrimitives';
import { humanize } from '@/modules/assets/components/assetsPageUtils';
import {
  assetCategoryOptions,
  assetConditionOptions,
  assetStatusOptions,
  type AssetInput,
} from '@/modules/assets/schema/assetSchemas';
import type { AssetCategory, AssetCondition, AssetStatus } from '@/modules/assets/types/assetTypes';

export function AssetFormDialog({
  open,
  onOpenChange,
  assetForm,
  setAssetForm,
  isSaving,
  editingAssetId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetForm: AssetInput;
  setAssetForm: (value: AssetInput) => void;
  isSaving: boolean;
  editingAssetId: string | null;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw]! max-w-230! overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white p-0">
        <div className="flex max-h-[84vh] flex-col">
          <DialogHeader className="border-b border-[#eef0f3] px-6 py-5 text-left">
            <DialogTitle className="text-[24px] font-semibold tracking-[-0.02em] text-[#111827]">
              {editingAssetId ? 'Edit Asset' : 'Add Asset'}
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-6 text-[#6b7280]">
              Keep asset code and serial number simple and editable for now. You can extend scanning later.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Asset Name"
                value={assetForm.name}
                onChange={(value) => setAssetForm({ ...assetForm, name: value })}
              />
              <InputField
                label="Asset Code / Tag ID"
                value={assetForm.assetCode}
                onChange={(value) => setAssetForm({ ...assetForm, assetCode: value })}
              />

              <Select
                value={assetForm.category}
                onValueChange={(value) =>
                  setAssetForm({ ...assetForm, category: value as AssetCategory })
                }
              >
                <FieldSelect label="Category">
                  <SelectValue />
                </FieldSelect>
                <SelectContent>
                  {assetCategoryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {humanize(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <InputField
                label="Serial Number"
                value={assetForm.serialNumber || ''}
                onChange={(value) => setAssetForm({ ...assetForm, serialNumber: value })}
              />

              <InputField
                label="Model"
                value={assetForm.model || ''}
                onChange={(value) => setAssetForm({ ...assetForm, model: value })}
              />

              <DateField
                label="Purchase Date"
                value={assetForm.purchaseDate || ''}
                onChange={(value) => setAssetForm({ ...assetForm, purchaseDate: value })}
              />

              <NumberField
                label="Purchase Price"
                value={assetForm.purchasePrice}
                onChange={(value) => setAssetForm({ ...assetForm, purchasePrice: value })}
              />

              <DateField
                label="Warranty Expiry Date"
                value={assetForm.warrantyExpiryDate || ''}
                onChange={(value) => setAssetForm({ ...assetForm, warrantyExpiryDate: value })}
              />

              <Select
                value={assetForm.condition}
                onValueChange={(value) =>
                  setAssetForm({ ...assetForm, condition: value as AssetCondition })
                }
              >
                <FieldSelect label="Current Condition">
                  <SelectValue />
                </FieldSelect>
                <SelectContent>
                  {assetConditionOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {humanize(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={assetForm.status}
                onValueChange={(value) =>
                  setAssetForm({ ...assetForm, status: value as AssetStatus })
                }
              >
                <FieldSelect label="Current Status">
                  <SelectValue />
                </FieldSelect>
                <SelectContent>
                  {assetStatusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {humanize(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <InputField
                label="Location"
                value={assetForm.location || ''}
                onChange={(value) => setAssetForm({ ...assetForm, location: value })}
              />

              <NumberField
                label="Quantity"
                value={assetForm.quantity}
                onChange={(value) => setAssetForm({ ...assetForm, quantity: value ?? 1 })}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-[#eef0f3] px-6 py-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full px-5">
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="rounded-full px-6 text-white"
              style={{ backgroundColor: ACTION_GREEN }}
            >
              {isSaving ? 'Saving...' : editingAssetId ? 'Save Changes' : 'Create Asset'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
