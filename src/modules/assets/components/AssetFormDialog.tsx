'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  PackagePlus,
  Plus,
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
  FieldSelect,
  InputField,
  NumberField,
} from '@/modules/assets/components/assetsPagePrimitives';
import { humanize } from '@/modules/assets/lib/assetUtils';
import {
  assetConditionOptions,
  type BulkAssetCreateInput,
} from '@/modules/assets/schema/assetSchemas';
import type {
  AssetCategoryDefinition,
  AssetCategoryFieldDefinition,
  AssetCondition,
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
      return <InputField label={fieldDef.fieldName} value={value || ''} onChange={(v) => onChange(v || null)} />;
    case 'BOOLEAN':
      return (
        <div className="grid gap-1.5">
          <Label className="text-[13px] font-medium text-transparent select-none hidden md:block">Placeholder</Label>
          <div className="flex h-10 items-center gap-2">
            <Checkbox id={`cf-${fieldDef.id}`} checked={value === 'true'} onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')} />
            <Label htmlFor={`cf-${fieldDef.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">{fieldDef.fieldName}</Label>
          </div>
        </div>
      );
    case 'SELECT': {
      const options = fieldDef.fieldOptions?.options || [];
      return (
        <div className="grid gap-1.5">
          <Label className="text-[13px] font-medium text-[#4b5563]">{fieldDef.fieldName}</Label>
          <Select value={value || undefined} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="w-full h-10 rounded-lg border-[#e5e7eb] text-sm shadow-none focus:ring-1 focus:ring-primary focus:border-transparent">
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
  isSaving,
  onSaveBulk,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
  onSaveBulk: (data: BulkAssetCreateInput) => Promise<void>;
  categories?: AssetCategoryDefinition[];
}) {
  const [assetName, setAssetName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [assetCode, setAssetCode] = useState('');
  const [condition, setCondition] = useState<AssetCondition>('GOOD');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [serials, setSerials] = useState<string[]>(['']);
  const [customFields, setCustomFields] = useState<Record<string, string | null>>({});
  const [useCustomAssetCode, setUseCustomAssetCode] = useState(false);

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);
  const dynamicFields = selectedCategory?.fields || [];

  const uniqueAssetCodes = useMemo(() => {
    const codes = new Set<string>();
    (categories || []).forEach((c) => {
      if (c.assetCode) codes.add(c.assetCode);
    });
    return Array.from(codes).sort();
  }, [categories]);

  function handleCategorySelect(catId: string) {
    setSelectedCategoryId(catId);
    const cat = categories?.find((c) => c.id === catId);
    if (cat?.assetCode) {
      setAssetCode(cat.assetCode);
      setUseCustomAssetCode(false);
    }
    setCustomFields({});
  }

  function handleAssetCodeSelect(code: string) {
    if (code === '__custom__') {
      setUseCustomAssetCode(true);
      setAssetCode('');
      return;
    }
    setAssetCode(code);
    const cat = categories?.find((c) => c.assetCode === code);
    if (cat) {
      setSelectedCategoryId(cat.id);
      setUseCustomAssetCode(false);
    }
  }

  function handleQuantityChange(n: number) {
    const val = Math.max(1, n);
    setQuantity(val);
    if (val > serials.length) {
      setSerials([...serials, ...Array(val - serials.length).fill('')]);
    } else {
      setSerials(serials.slice(0, val));
    }
  }

  function updateSerial(index: number, value: string) {
    const next = [...serials];
    next[index] = value;
    setSerials(next);
  }

  function handleFieldChange(fieldDefId: string, value: string | null) {
    setCustomFields((prev) => ({ ...prev, [fieldDefId]: value }));
  }

  function getFieldValue(fieldDefId: string): string | null {
    return customFields[fieldDefId] ?? null;
  }

  async function handleSave() {
    const payload: BulkAssetCreateInput = {
      assetCode: assetCode.trim(),
      name: assetName.trim(),
      categoryDefinitionId: selectedCategoryId,
      condition,
      location,
      serialNumbers: serials.filter((s) => s.trim()),
      customFields: Object.entries(customFields)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([fieldDefinitionId, value]) => ({ fieldDefinitionId, value })),
    };
    await onSaveBulk(payload);
  }

  function handleReset() {
    setAssetName('');
    setSelectedCategoryId(null);
    setAssetCode('');
    setCondition('GOOD');
    setLocation('');
    setQuantity(1);
    setSerials(['']);
    setCustomFields({});
    setUseCustomAssetCode(false);
  }

  const sectionNumber = { base: 1, dynamic: 2, config: 3, serials: 4 };

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
              className="fixed left-1/2 top-1/2 z-50 flex h-155 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#f3fbf5] text-[#156f3d]">
                    <PackagePlus className="size-4.5" />
                  </div>
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#111827]">
                      Add Asset
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[#6b7280]">
                      Register new physical assets in the system
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
                  {/* Section 1: Basic Details */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                       <span className="flex size-6 items-center justify-center rounded-md bg-[#1d1d1f] text-[11px] font-semibold text-white">{sectionNumber.base}</span>
                      <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Basic Details</span>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <InputField label="Asset Name" value={assetName} onChange={(v) => setAssetName(v)} />

                      {/* Category select */}
                      <div className="grid gap-1.5">
                        <Label className="text-[13px] font-medium text-[#4b5563]">Category</Label>
                        <Select value={selectedCategoryId || undefined} onValueChange={handleCategorySelect}>
                          <SelectTrigger className="w-full h-10 rounded-lg border-[#e5e7eb] text-sm shadow-none focus:ring-1 focus:ring-primary focus:border-transparent">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {(categories || []).map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}{cat.assetCode ? ` (${cat.assetCode})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Asset Code */}
                      {uniqueAssetCodes.length > 0 && !useCustomAssetCode ? (
                        <div className="grid gap-1.5">
                          <Label className="text-[13px] font-medium text-[#4b5563]">Asset ID / Code</Label>
                          <Select value={assetCode || undefined} onValueChange={handleAssetCodeSelect}>
                            <SelectTrigger className="w-full h-10 rounded-lg border-[#e5e7eb] text-sm shadow-none focus:ring-1 focus:ring-primary focus:border-transparent">
                              <SelectValue placeholder="Auto-filled from category" />
                            </SelectTrigger>
                            <SelectContent>
                              {uniqueAssetCodes.map((code) => (
                                <SelectItem key={code} value={code}>{code}</SelectItem>
                              ))}
                              <div className="mx-2 my-1 border-t border-[#eef0f3]" />
                              <SelectItem value="__custom__">
                                <span className="text-[#6b7280]">+ Custom code</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="grid gap-1.5">
                          <Label className="text-[13px] font-medium text-[#4b5563]">Asset ID / Code</Label>
                          <Input
                            value={assetCode}
                            onChange={(e) => setAssetCode(e.target.value)}
                            placeholder="e.g. AST-LAP"
                            className="h-10 rounded-lg border-[#e5e7eb] text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-transparent"
                          />
                          {useCustomAssetCode && uniqueAssetCodes.length > 0 && (
                            <button
                              type="button"
                              onClick={() => { setUseCustomAssetCode(false); setAssetCode(''); }}
                              className="text-left text-[12px] text-primary hover:underline"
                            >
                              Back to predefined codes
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Dynamic Fields */}
                  {dynamicFields.length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-md bg-[#1d1d1f] text-[11px] font-semibold text-white">{sectionNumber.dynamic}</span>
                        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">{selectedCategory?.name} Fields</span>
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

                  {/* Section 3: Configuration */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-md bg-[#1d1d1f] text-[11px] font-semibold text-white">{dynamicFields.length > 0 ? sectionNumber.dynamic + 1 : sectionNumber.config}</span>
                      <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Configuration</span>
                    </div>
                    <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Select value={condition} onValueChange={(v) => setCondition(v as AssetCondition)}>
                          <FieldSelect label="Current Condition"><SelectValue /></FieldSelect>
                          <SelectContent>{assetConditionOptions.map((o) => <SelectItem key={o} value={o}>{humanize(o)}</SelectItem>)}</SelectContent>
                        </Select>
                        <InputField label="Location" value={location} onChange={(v) => setLocation(v)} />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Quantity & Serial Numbers */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-md bg-[#1d1d1f] text-[11px] font-semibold text-white">{dynamicFields.length > 0 ? sectionNumber.dynamic + 2 : sectionNumber.serials}</span>
                      <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Quantity & Serial Numbers</span>
                    </div>
                    <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-32">
                          <NumberField label="Quantity" value={quantity} onChange={(v) => handleQuantityChange(v ?? 1)} />
                        </div>
                        <div className="flex gap-1.5 pt-5">
                          <button type="button" onClick={() => { setSerials([...serials, '']); setQuantity(quantity + 1); }}
                            className="flex size-8 items-center justify-center rounded-lg border border-[#d8dde5] text-[#6b7280] transition-colors hover:border-[#cdd5df] hover:text-[#1d1d1f]">
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-[#9ca3af]">Each quantity creates a separate physical asset row with its own serial number.</p>
                      <div className="grid gap-3 mt-3 md:grid-cols-2">
                        {serials.map((serial, i) => (
                          <div key={i} className="grid gap-1.5">
                            <Label className="text-[13px] font-medium text-[#4b5563]">Serial #{i + 1}</Label>
                            <div className="flex items-center gap-1.5">
                              <Input value={serial} onChange={(e) => updateSerial(i, e.target.value)}
                                placeholder={`Serial for unit ${i + 1}`} className="h-10 rounded-lg border-[#e5e7eb] text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-transparent" />
                              {serials.length > 1 && (
                                <button type="button" onClick={() => { setSerials(serials.filter((_, j) => j !== i)); setQuantity(quantity - 1); }}
                                  className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-transparent text-[#9ca3af] hover:border-red-100 hover:bg-red-50 hover:text-[#b3261e] transition-colors">
                                  <X className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#eef0f3] px-6 py-4 shrink-0">
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => onOpenChange(false)}
                    className="rounded-lg px-4 text-[13px]">
                    Cancel
                  </Button>
                  <Button variant="ghost" onClick={handleReset}
                    className="rounded-lg px-4 text-[13px] text-[#6b7280]">
                    Reset
                  </Button>
                </div>
                <Button onClick={() => void handleSave()} disabled={isSaving || !assetName.trim() || !assetCode.trim() || serials.filter(s => s.trim()).length === 0}
                  className="h-10 rounded-lg px-5 text-sm font-medium text-white shadow-sm"
                  style={{ backgroundColor: ACTION_GREEN }}>
                  <Check className="mr-1.5 size-4" />
                  {isSaving ? 'Creating...' : `Create ${serials.filter(s => s.trim()).length} Asset${serials.filter(s => s.trim()).length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
