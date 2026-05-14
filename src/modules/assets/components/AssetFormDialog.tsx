'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  PackagePlus,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ACTION_GREEN } from '@/modules/assets/lib/assetConfig';
import {
  DateField,
  FieldSelect,
  InputField,
  NumberField,
} from '@/modules/assets/components/assetsPagePrimitives';
import { humanize } from '@/modules/assets/lib/assetUtils';
import {
  assetConditionOptions,
  assetStatusOptions,
  type AssetInput,
} from '@/modules/assets/schema/assetSchemas';
import type {
  AssetCategoryDefinition,
  AssetCategoryFieldDefinition,
  AssetCondition,
  AssetIdDefinition,
  AssetStatus,
} from '@/modules/assets/types/assetTypes';

function DynamicFieldRenderer({
  fieldDef,
  value,
  onChange,
}: {
  fieldDef: AssetCategoryFieldDefinition;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  switch (fieldDef.fieldType) {
    case 'TEXT':
      return (
        <InputField label={fieldDef.fieldName} value={value || ''} onChange={(v) => onChange(v || null)} />
      );
    case 'NUMBER':
      return (
        <NumberField label={fieldDef.fieldName} value={value ? Number(value) : null} onChange={(v) => onChange(v !== null ? String(v) : null)} />
      );
    case 'DATE':
      return <DateField label={fieldDef.fieldName} value={value || ''} onChange={(v) => onChange(v || null)} />;
    case 'BOOLEAN':
      return (
        <div className="flex items-center gap-2">
          <Checkbox id={`cf-${fieldDef.id}`} checked={value === 'true'} onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')} />
          <Label htmlFor={`cf-${fieldDef.id}`} className="text-[14px] text-[#111827] cursor-pointer">{fieldDef.fieldName}</Label>
        </div>
      );
    case 'SELECT': {
      const options = fieldDef.fieldOptions?.options || [];
      return (
        <div className="grid gap-2">
          <Label className="text-[13px] text-[#6b7280]">{fieldDef.fieldName}</Label>
          <Select value={value || undefined} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="h-11 rounded-2xl border-[#e5e7eb] shadow-none">
              <SelectValue placeholder={`Select ${fieldDef.fieldName.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    }
    default:
      return <InputField label={fieldDef.fieldName} value={value || ''} onChange={(v) => onChange(v || null)} />;
  }
}

export function AssetFormDialog({
  open,
  onOpenChange,
  assetForm,
  setAssetForm,
  isSaving,
  editingAssetId,
  onSave,
  categories,
  assetIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetForm: AssetInput;
  setAssetForm: (value: AssetInput) => void;
  isSaving: boolean;
  editingAssetId: string | null;
  onSave: () => void;
  categories?: AssetCategoryDefinition[];
  assetIds?: AssetIdDefinition[];
}) {
  const [useCustomCode, setUseCustomCode] = useState(false);
  const selectedCategoryDef = categories?.find((c) => c.id === assetForm.categoryDefinitionId);
  const dynamicFields = selectedCategoryDef?.fields || [];
  const quantity = assetForm.quantity || 1;
  const currentUnits = assetForm.units || [];

  const matchedAssetId = useMemo(
    () => assetIds?.find((aid) => aid.assetIdName === assetForm.assetCode),
    [assetIds, assetForm.assetCode],
  );

  function handleFieldChange(fieldDefId: string, value: string | null) {
    const existing = (assetForm.customFields || []).find((cf) => cf.fieldDefinitionId === fieldDefId);
    setAssetForm({
      ...assetForm,
      customFields: existing
        ? (assetForm.customFields || []).map((cf) =>
            cf.fieldDefinitionId === fieldDefId ? { ...cf, value } : cf
          )
        : [...(assetForm.customFields || []), { fieldDefinitionId: fieldDefId, value }],
    });
  }

  function getFieldValue(fieldDefId: string): string | null {
    return (assetForm.customFields || []).find((cf) => cf.fieldDefinitionId === fieldDefId)?.value ?? null;
  }

  function handleAssetIdSelect(idValue: string) {
    if (idValue === '__custom__') {
      setUseCustomCode(true);
      return;
    }
    setUseCustomCode(false);
    setAssetForm({ ...assetForm, assetCode: idValue });
  }

  function updateUnitSerial(index: number, serial: string) {
    const units = [...currentUnits];
    while (units.length <= index) units.push({ serialNumber: '' });
    units[index] = { ...units[index], serialNumber: serial || null };
    setAssetForm({ ...assetForm, units });
  }

  function addSerialInput() {
    setAssetForm({ ...assetForm, units: [...currentUnits, { serialNumber: '' }], quantity: quantity + 1 });
  }

  function removeLastSerial() {
    const units = currentUnits.slice(0, -1);
    setAssetForm({ ...assetForm, units, quantity: Math.max(1, quantity - 1) });
  }

  const showAssetIdSelect = !editingAssetId && assetIds && assetIds.length > 0 && !useCustomCode;

  function renderAssetCodeField() {
    if (showAssetIdSelect) {
      return (
        <div className="grid gap-2">
          <Label className="text-[13px] text-[#6b7280]">Asset Code</Label>
          <Select value={assetForm.assetCode || undefined} onValueChange={handleAssetIdSelect}>
            <SelectTrigger className="h-11 rounded-2xl border-[#e5e7eb] shadow-none">
              <SelectValue placeholder="Choose an asset ID" />
            </SelectTrigger>
            <SelectContent>
              {assetIds.map((aid) => (
                <SelectItem key={aid.id} value={aid.assetIdName}>
                  {aid.assetIdName}
                </SelectItem>
              ))}
              <div className="mx-2 my-1 border-t border-[#eef0f3]" />
              <SelectItem value="__custom__">
                <span className="text-[#6b7280]">+ Custom entry</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div className="grid gap-2">
        <Label className="text-[13px] text-[#6b7280]">Asset Code</Label>
        <Input
          value={assetForm.assetCode}
          onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
          placeholder="e.g. LAP-001"
          className="h-11 rounded-2xl border-[#e5e7eb] text-[15px]"
        />
        {useCustomCode && assetIds && assetIds.length > 0 && (
          <button
            type="button"
            onClick={() => { setUseCustomCode(false); setAssetForm({ ...assetForm, assetCode: '' }); }}
            className="text-left text-[12px] text-[#00874a] hover:underline"
          >
            Back to asset IDs
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 320, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 320, y: 40, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
              className="fixed left-1/2 top-1/2 z-50 flex h-155 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#f3fbf5] text-[#156f3d]">
                    <PackagePlus className="size-4.5" />
                  </div>
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#111827]">
                      {editingAssetId ? 'Edit Asset' : 'Add Asset'}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[#6b7280]">
                      {editingAssetId ? 'Update asset register details' : 'Register a new asset in the system'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]">
                  <X className="size-4.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-6">
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-semibold text-white">1</span>
                      <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Basic Details</span>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <InputField label="Asset Name" value={assetForm.name} onChange={(v) => setAssetForm({ ...assetForm, name: v })} />
                      {renderAssetCodeField()}
                      <div className="grid gap-2">
                        <Label className="text-[13px] text-[#6b7280]">Category</Label>
                        <Select value={assetForm.categoryDefinitionId || undefined}
                          onValueChange={(v) => setAssetForm({ ...assetForm, categoryDefinitionId: v, customFields: [], units: [] })}>
                          <SelectTrigger className="h-11 rounded-2xl border-[#e5e7eb] shadow-none">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {(categories || []).map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {dynamicFields.length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-semibold text-white">2</span>
                        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">{selectedCategoryDef?.name} Fields</span>
                      </div>
                      <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {dynamicFields.sort((a, b) => a.displayOrder - b.displayOrder).map((fd) => (
                            <DynamicFieldRenderer key={fd.id} fieldDef={fd} value={getFieldValue(fd.id)} onChange={(v) => handleFieldChange(fd.id, v)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-semibold text-white">{dynamicFields.length > 0 ? '3' : '2'}</span>
                      <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Configuration</span>
                    </div>
                    <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Select value={assetForm.condition} onValueChange={(v) => setAssetForm({ ...assetForm, condition: v as AssetCondition })}>
                          <FieldSelect label="Current Condition"><SelectValue /></FieldSelect>
                          <SelectContent>{assetConditionOptions.map((o) => <SelectItem key={o} value={o}>{humanize(o)}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={assetForm.status} onValueChange={(v) => setAssetForm({ ...assetForm, status: v as AssetStatus })}>
                          <FieldSelect label="Current Status"><SelectValue /></FieldSelect>
                          <SelectContent>{assetStatusOptions.map((o) => <SelectItem key={o} value={o}>{humanize(o)}</SelectItem>)}</SelectContent>
                        </Select>
                        <InputField label="Location" value={assetForm.location || ''} onChange={(v) => setAssetForm({ ...assetForm, location: v })} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-semibold text-white">{dynamicFields.length > 0 ? '4' : '3'}</span>
                      <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Quantity & Serial Numbers</span>
                    </div>
                    <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-32">
                          <NumberField label="Quantity" value={quantity} onChange={(v) => {
                            const n = v ?? 1; const u = [...currentUnits];
                            while (u.length < n) u.push({ serialNumber: '' });
                            setAssetForm({ ...assetForm, quantity: n, units: u.slice(0, n) });
                          }} />
                        </div>
                        <div className="flex gap-1.5 pt-5">
                          <button type="button" onClick={addSerialInput}
                            className="flex size-8 items-center justify-center rounded-full border border-[#d8dde5] text-[#6b7280] transition-colors hover:border-[#cdd5df] hover:text-[#1d1d1f]">
                            <PackagePlus className="size-3.5" />
                          </button>
                          <button type="button" onClick={removeLastSerial} disabled={currentUnits.length <= 1}
                            className="flex size-8 items-center justify-center rounded-full border border-[#d8dde5] text-[#6b7280] transition-colors hover:border-[#cdd5df] hover:text-[#1d1d1f] disabled:opacity-40">
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-2 mt-3 md:grid-cols-2">
                        {Array.from({ length: quantity }).map((_, i) => (
                          <div key={i} className="grid gap-1.5">
                            <Label className="text-[12px] text-[#6b7280]">Serial #{i + 1}</Label>
                            <Input value={currentUnits[i]?.serialNumber || ''} onChange={(e) => updateUnitSerial(i, e.target.value)}
                              placeholder={`Serial for unit ${i + 1}`} className="h-10 rounded-xl border-[#e5e7eb] text-[13px]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#eef0f3] px-6 py-4 shrink-0">
                <Button variant="ghost" onClick={() => onOpenChange(false)}
                  className="rounded-full px-5 text-[13px]">
                  Cancel
                </Button>
                <Button onClick={onSave} disabled={isSaving}
                  className="h-10 rounded-full px-6 text-[14px] font-medium text-white"
                  style={{ backgroundColor: ACTION_GREEN }}>
                  <Check className="mr-1.5 size-4" />
                  {isSaving ? 'Saving...' : editingAssetId ? 'Save Changes' : 'Create Asset'}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
